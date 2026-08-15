tailwind.config = {
    theme: {
        extend: {
            fontFamily: { sans: ['Inter', 'sans-serif'] },
            colors: {
                // Premium rebrand: deep navy base + restrained gold accent.
                // Gold is kept strictly for interactive states, buttons & active markers.
                old: '#26396f',       // legacy blue (used in previous branding)
                ink: '#0a1128',       // page background (deep navy)
                surface: '#121e3f',   // raised cards / nav (slightly lighter)
                elevated: '#1a2b59',  // elevated panels
                line: '#26396f',      // hairline borders
                gold: '#d4af37',      // brand accent (premium gold)
                goldsoft: '#c9a227',  // slightly softened gold for fills
                mute: '#a0b2d6',      // muted body text
                faint: '#586d9a',     // secondary text
            },
            keyframes: {
                marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
            },
            animation: { marquee: 'marquee 30s linear infinite' },
        }
    }
}