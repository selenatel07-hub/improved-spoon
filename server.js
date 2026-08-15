require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const archiver = require('archiver');
const rimraf = require('rimraf');
const TelegramBot = require('node-telegram-bot-api');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'submissions';

// derive numeric bot id from token for quick sanity checks
const BOT_ID_FROM_TOKEN = BOT_TOKEN ? String(BOT_TOKEN).split(':')[0] : null;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error('Missing BOT_TOKEN or CHAT_ID in environment. See .env.example');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN);
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Simple request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// CORS / preflight handler (set CORS_ORIGIN in .env to restrict)
app.use((req, res, next) => {
  const origin = process.env.CORS_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ensure upload dir exists
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function makeStorage() {
  return multer.diskStorage({
    destination: function (req, file, cb) {
      const id = req._submissionId;
      const dest = path.join(UPLOAD_DIR, id);
      fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    },
    filename: function (req, file, cb) {
      // keep original filename
      cb(null, file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_'));
    }
  });
}

// middleware to assign a submission id per request
app.use('/api/submit', (req, res, next) => {
  const id = Date.now().toString();
  req._submissionId = id;
  next();
});

const upload = multer({ storage: makeStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

app.get('/api/test', (req, res) => {
  console.log('GET /api/test received');

  res.status(200).json({
    ok: true,
    message: 'API is reachable',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/test-post', (req, res) => {
  console.log('*** POST TEST RECEIVED ***');

  res.status(200).json({
    ok: true,
    message: 'POST response is working',
    timestamp: new Date().toISOString()
  });

  console.log('*** POST TEST RESPONSE SENT ***');
});

app.post('/api/submit', (req, res) => {
  console.log('\n=== INCOMING SUBMISSION ===');
  const id = req._submissionId;
  console.log(`[${id}] POST /api/submit received`);

  // Use multer as middleware but handle its errors explicitly
  upload.any()(req, res, async function (err) {
    if (err) {
      console.error(`[${id}] UPLOAD ERROR:`, err.message);
      return res.status(400).json({ ok: false, error: err.message || 'Upload error' });
    }

    try {
      const dir = path.join(UPLOAD_DIR, id);
      console.log(`[${id}] Files received:`, (req.files || []).length);
      (req.files || []).forEach((f, i) => {
        console.log(`[${id}]   File ${i + 1}: ${f.originalname} (${f.size} bytes)`);
      });

      // ensure dir exists even if no files were uploaded
      fs.mkdirSync(dir, { recursive: true });

      // save metadata
      const metadata = {
        id,
        timestamp: new Date().toISOString(),
        fields: req.body,
        files: (req.files || []).map(f => ({ originalname: f.originalname, path: f.path, size: f.size }))
      };
      console.log(`[${id}] Saving metadata...`);
      await fsp.writeFile(path.join(dir, 'metadata.json'), JSON.stringify(metadata, null, 2));
      console.log(`[${id}] Metadata saved`);

      // create zip
      const zipPath = path.join(UPLOAD_DIR, `submission-${id}.zip`);
      console.log(`[${id}] Creating ZIP file...`);
      await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        output.on('close', () => {
          console.log(`[${id}] ZIP created (${fs.statSync(zipPath).size} bytes)`);
          resolve();
        });
        archive.on('error', err => {
          console.error(`[${id}] ZIP error:`, err);
          reject(err);
        });
        archive.pipe(output);
        archive.directory(dir, false);
        archive.finalize();
      });

      // sanity: don't try to send messages to the bot itself — that yields 403
      if (BOT_ID_FROM_TOKEN && String(CHAT_ID) === BOT_ID_FROM_TOKEN) {
        const msg = 'Configured CHAT_ID appears to be the bot itself. Bots cannot send messages to themselves. Obtain a user/group chat id (see server logs or use getUpdates) and update .env.';
        console.error(`[${id}] ${msg}`);
        // cleanup files
        rimraf.sync(dir);
        try { fs.unlinkSync(zipPath); } catch (e) { }
        return res.status(400).json({ ok: false, error: msg });
      }

      // send zip to telegram
      console.log(`[${id}] Sending ZIP to Telegram...`);
      const docResult = await bot.sendDocument(CHAT_ID, fs.createReadStream(zipPath), {}, { filename: path.basename(zipPath) });
      console.log(`[${id}] ZIP sent to Telegram (message ID: ${docResult.message_id})`);

      // send text summary
      console.log(`[${id}] Sending summary message...`);
      const summary = [];
      summary.push(`New submission: ${id}`);
      summary.push(`Fields:`);
      for (const [k, v] of Object.entries(req.body || {})) {
        summary.push(`${k}: ${v}`);
      }
      const msgResult = await bot.sendMessage(CHAT_ID, summary.join('\n'));
      console.log(`[${id}] Summary sent (message ID: ${msgResult.message_id})`);

      // cleanup (remove dir and zip)
      console.log(`[${id}] Cleaning up local files...`);
      rimraf.sync(dir);
      try { fs.unlinkSync(zipPath); } catch (e) { /* ignore */ }
      console.log(`[${id}] Cleanup complete`);

      console.log(`[${id}] ✓ SUBMISSION COMPLETE - sending success response`);
      res.json({ ok: true, id });
    } catch (err) {
      const id = req._submissionId;
      console.error(`[${id}] ✗ SUBMISSION ERROR:`, err.message);
      console.error(`[${id}] Stack:`, err.stack);
      if (!res.headersSent) {
        console.log(`[${id}] Sending error response...`);
        res.status(500).json({ ok: false, error: err.message });
      } else {
        console.warn(`[${id}] Headers already sent, cannot send error response`);
      }
    }
  });
});

// generic error handler to ensure JSON responses
app.use((err, req, res, next) => {
  console.error('Unhandled error', err);
  if (!res.headersSent) return res.status(500).json({ ok: false, error: err.message || 'Server error' });
  next(err);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Submission server running on http://localhost:${PORT}`));
