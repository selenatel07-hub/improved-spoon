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


