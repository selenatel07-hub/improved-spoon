// Ping the backend to wake up the Render instance immediately
(function wakeUpServer() {
    const SERVER_URL = window.SERVER_URL || 'https://novamittel.onrender.com';
    fetch(SERVER_URL + '/api/test').catch(() => { });
})();
// Hamburger Icon Functionality for Mobile Navigation
(function () {
    const btn = document.getElementById('nav-toggle');
    const menu = document.getElementById('nav-menu');
    if (!btn || !menu) return;

    btn.addEventListener('click', function () {
        const nowHidden = menu.classList.toggle('hidden');
        menu.classList.toggle('flex', !nowHidden);
        btn.setAttribute('aria-expanded', String(!nowHidden));
        btn.setAttribute('aria-label', nowHidden ? 'Navigation öffnen' : 'Navigation schließen');
        // lock body scroll when open on mobile
        if (!nowHidden) {
            document.body.classList.add('overflow-hidden');
        } else {
            document.body.classList.remove('overflow-hidden');
        }
        const icon = btn.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-bars', nowHidden);
        }
    });

    // Close menu when clicking outside (mobile only)
    document.addEventListener('click', function (e) {
        if (window.innerWidth >= 1024) return;
        if (!menu.classList.contains('hidden') && !menu.contains(e.target) && !btn.contains(e.target)) {
            menu.classList.add('hidden');
            menu.classList.remove('flex');
            btn.setAttribute('aria-expanded', 'false');
            const icon = btn.querySelector('i');
            if (icon) { icon.classList.add('fa-bars'); }
            document.body.classList.remove('overflow-hidden');
        }
    });

    // Ensure body scroll restored on resize to desktop
    window.addEventListener('resize', function () {
        if (window.innerWidth >= 1024) {
            document.body.classList.remove('overflow-hidden');
        }
    });
})();



// Notification helper (global)
window['showNotification'] = function (icon, title, text, isSuccess = false) {
    const notif = document.getElementById('notification');
    const content = document.getElementById('notificationContent');
    const notifIcon = document.getElementById('notificationIcon');
    const notifTitle = document.getElementById('notificationTitle');
    const notifText = document.getElementById('notificationText');

    if (!notif) return;

    notifIcon.className = icon + ' mt-1 text-2xl';
    notifIcon.style.color = isSuccess ? '#d4af37' : '#ff6b6b';
    notifTitle.textContent = title;
    notifText.textContent = text;

    if (isSuccess) {
        content.classList.remove('border-line');
        content.classList.add('border-gold', 'bg-surface');
    } else {
        content.classList.add('border-line');
    }

    notif.classList.remove('hidden');

    if (isSuccess) {
        setTimeout(() => {
            notif.classList.add('hidden');
        }, 4000);
    }
};

// Contact form logic
document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');
    if (!contactForm) return;

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('contactSubmitBtn');
        const originalText = btn.innerHTML;

        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SENDEN...';

            const payload = {
                name: document.getElementById('contactName').value,
                email: document.getElementById('contactEmail').value,
                type: document.getElementById('contactType').value,
                message: document.getElementById('contactMessage').value
            };

            const SERVER_URL = window.SERVER_URL || 'https://novamittel.onrender.com';
            const response = await fetch(`${SERVER_URL}/api/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok && result.ok) {
                // Show success message using Swal if available, else custom Toast Notification
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'success',
                        title: 'Nachricht gesendet',
                        text: 'Vielen Dank für Ihre Nachricht. Wir werden uns in Kürze bei Ihnen melden.',
                        confirmButtonColor: '#d4af37',
                        background: '#121212',
                        color: '#ffffff'
                    });
                } else {
                    window.showNotification('fas fa-check-circle', 'Nachricht gesendet', 'Vielen Dank für Ihre Nachricht. Wir werden uns in Kürze bei Ihnen melden.', true);
                }
                contactForm.reset();
            } else {
                throw new Error(result.error || 'Fehler beim Senden der Nachricht');
            }
        } catch (err) {
            console.error(err);
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: 'Fehler',
                    text: err.message,
                    confirmButtonColor: '#d4af37',
                    background: '#121212',
                    color: '#ffffff'
                });
            } else {
                window.showNotification('fas fa-exclamation-circle', 'Fehler', err.message, false);
            }
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });
});
