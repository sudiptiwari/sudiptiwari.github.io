(function () {
    'use strict';

    var root = document.documentElement;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var $ = function (sel) { return document.querySelector(sel); };

    /* ---------- Theme toggle ---------- */
    var themeBtn = $('#theme-toggle');
    var themeMeta = document.querySelector('meta[name="theme-color"]');

    function applyTheme(theme) {
        root.setAttribute('data-theme', theme);
        if (themeMeta) themeMeta.setAttribute('content', theme === 'dark' ? '#0D1322' : '#F6F7FB');
        if (themeBtn) {
            themeBtn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
        }
    }
    applyTheme(root.getAttribute('data-theme') || 'light');

    if (themeBtn) {
        themeBtn.addEventListener('click', function () {
            var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            applyTheme(next);
            try { localStorage.setItem('theme', next); } catch (e) { /* storage unavailable */ }
        });
    }

    /* ---------- Mobile menu ---------- */
    var menuBtn = $('#menu-toggle');
    var nav = $('#nav');

    function setMenu(open) {
        if (!menuBtn || !nav) return;
        nav.classList.toggle('is-open', open);
        menuBtn.setAttribute('aria-expanded', String(open));
        menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
    if (menuBtn && nav) {
        menuBtn.addEventListener('click', function () {
            setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
        });
        nav.addEventListener('click', function (e) {
            if (e.target.closest('a')) setMenu(false);
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') {
                setMenu(false);
                menuBtn.focus();
            }
        });
        window.matchMedia('(min-width: 52.01rem)').addEventListener('change', function (e) {
            if (e.matches) setMenu(false);
        });
    }

    /* ---------- Header border and scroll progress ---------- */
    var header = $('#site-header');
    var progress = $('#progress');
    var ticking = false;

    function onScroll() {
        var y = window.scrollY || root.scrollTop;
        var max = root.scrollHeight - window.innerHeight;
        if (header) header.classList.toggle('is-scrolled', y > 8);
        if (progress) progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
        ticking = false;
    }
    window.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
    }, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();

    /* ---------- Active section in the nav ---------- */
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav a[href^="#"]'));
    var sections = links
        .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
        .filter(Boolean);

    if ('IntersectionObserver' in window && sections.length) {
        var spy = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                links.forEach(function (a) {
                    var on = a.getAttribute('href') === '#' + entry.target.id;
                    if (on) a.setAttribute('aria-current', 'true');
                    else a.removeAttribute('aria-current');
                });
            });
        }, { rootMargin: '-40% 0px -55% 0px' });
        sections.forEach(function (s) { spy.observe(s); });

        // Clear the highlight when back in the hero
        var hero = $('#top');
        if (hero) {
            new IntersectionObserver(function (entries) {
                if (entries[0].isIntersecting) links.forEach(function (a) { a.removeAttribute('aria-current'); });
            }, { rootMargin: '-40% 0px -55% 0px' }).observe(hero);
        }
    }

    /* ---------- Photo carousel (photos, brackets, label and caption move together) ---------- */
    var carousel = $('#carousel');

    if (carousel) {
        var slides = Array.prototype.slice.call(carousel.querySelectorAll('.slide'));
        var captions = Array.prototype.slice.call(carousel.querySelectorAll('.caption-item'));
        var dots = Array.prototype.slice.call(carousel.querySelectorAll('.dot'));
        var focusBox = $('#focus');
        var focusTag = $('#focus-tag');
        var prevBtn = $('#car-prev');
        var nextBtn = $('#car-next');
        var captionBox = $('#captions');

        var current = 0;
        var timer = null;
        var tagTimer = null;
        var autoAllowed = !reduceMotion.matches && slides.length > 1; // ends for good once the visitor interacts

        // If a photo link is missing or broken, keep the "ST" placeholder visible
        slides.forEach(function (slide) {
            var img = slide.querySelector('img');
            if (!img) return;
            var markMissing = function () { img.classList.add('is-missing'); };
            img.addEventListener('error', markMissing);
            if (img.complete && img.naturalWidth === 0) markMissing();
        });

        var applyFocus = function (slide) {
            var v = (slide.getAttribute('data-focus') || '').split(/\s+/);
            if (v.length === 4 && focusBox) {
                focusBox.style.top = v[0];
                focusBox.style.right = v[1];
                focusBox.style.bottom = v[2];
                focusBox.style.left = v[3];
            }
        };

        var setLive = function () {
            if (captionBox) captionBox.setAttribute('aria-live', timer ? 'off' : 'polite');
        };

        var go = function (n, initial) {
            n = (n + slides.length) % slides.length;
            if (n === current && !initial) return;

            slides[current].classList.remove('is-active');
            slides[current].setAttribute('aria-hidden', 'true');
            captions[current].classList.remove('is-active');
            captions[current].setAttribute('aria-hidden', 'true');
            dots[current].removeAttribute('aria-current');

            current = n;

            slides[current].classList.add('is-active');
            slides[current].removeAttribute('aria-hidden');
            captions[current].classList.add('is-active');
            captions[current].removeAttribute('aria-hidden');
            dots[current].setAttribute('aria-current', 'true');

            applyFocus(slides[current]);
            var label = slides[current].getAttribute('data-tag') || '';

            if (initial || reduceMotion.matches) {
                focusTag.textContent = label;
                return;
            }

            // Brackets re-lock while the photo cross-fades; the label swaps while they are hidden
            focusBox.classList.remove('is-refocus');
            void focusBox.offsetWidth;
            focusBox.classList.add('is-refocus');
            focusTag.classList.add('is-out');
            clearTimeout(tagTimer);
            tagTimer = setTimeout(function () {
                focusTag.textContent = label;
                focusTag.classList.remove('is-out');
            }, 280);
        };

        if (focusBox) {
            focusBox.addEventListener('animationend', function (e) {
                if (e.animationName === 'refocus') focusBox.classList.remove('is-refocus');
            }, true);
        }

        var stop = function () { clearInterval(timer); timer = null; setLive(); };
        var start = function () {
            if (!autoAllowed || timer) return;
            timer = setInterval(function () { go(current + 1); }, 6000);
            setLive();
        };
        var takeOver = function () { autoAllowed = false; stop(); };

        applyFocus(slides[0]);
        focusTag.textContent = slides[0].getAttribute('data-tag') || '';
        setLive();

        prevBtn.addEventListener('click', function () { takeOver(); go(current - 1); });
        nextBtn.addEventListener('click', function () { takeOver(); go(current + 1); });
        dots.forEach(function (dot, i) {
            dot.addEventListener('click', function () { takeOver(); go(i); });
        });

        carousel.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowLeft') { e.preventDefault(); takeOver(); go(current - 1); }
            else if (e.key === 'ArrowRight') { e.preventDefault(); takeOver(); go(current + 1); }
        });

        // Swipe on touch screens
        var portrait = $('#portrait');
        var startX = 0, startY = 0, tracking = false;
        portrait.addEventListener('pointerdown', function (e) {
            if (e.pointerType === 'mouse') return;
            tracking = true; startX = e.clientX; startY = e.clientY;
        });
        portrait.addEventListener('pointerup', function (e) {
            if (!tracking) return;
            tracking = false;
            var dx = e.clientX - startX, dy = e.clientY - startY;
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                takeOver();
                go(dx < 0 ? current + 1 : current - 1);
            }
        });
        portrait.addEventListener('pointercancel', function () { tracking = false; });

        // Pause while the visitor is pointing at or focused on the carousel, or the tab is hidden
        carousel.addEventListener('mouseenter', stop);
        carousel.addEventListener('mouseleave', start);
        carousel.addEventListener('focusin', stop);
        carousel.addEventListener('focusout', start);
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) stop(); else start();
        });

        setTimeout(start, 4500);
    }

    /* ---------- Email (assembled here so it is not sitting in the page source) ---------- */
    var mailParts = ['st7013', 'rit', 'edu'];
    var mailAddress = function () { return mailParts[0] + '@' + mailParts[1] + '.' + mailParts[2]; };

    Array.prototype.forEach.call(document.querySelectorAll('[data-mail]'), function (el) {
        el.addEventListener('click', function (e) {
            e.preventDefault();
            window.location.href = 'mailto:' + mailAddress();
        });
    });

    /* ---------- Copy email ---------- */
    var copyBtn = $('#copy-email');
    var toast = $('#toast');
    var toastTimer = null;
    var copyTimer = null;

    function showToast(message) {
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('is-visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toast.classList.remove('is-visible'); }, 2200);
    }

    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        document.body.removeChild(ta);
        return ok;
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', function () {
            var address = mailAddress();
            var done = function (ok) {
                var label = copyBtn.querySelector('span');
                if (ok) {
                    showToast('Email address copied');
                    copyBtn.classList.add('is-done');
                    label.textContent = 'Copied';
                    clearTimeout(copyTimer);
                    copyTimer = setTimeout(function () {
                        copyBtn.classList.remove('is-done');
                        label.textContent = 'Copy address';
                    }, 2200);
                } else {
                    showToast('Copy failed. Use the write an email button instead.');
                }
            };
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(address).then(function () { done(true); }, function () { done(fallbackCopy(address)); });
            } else {
                done(fallbackCopy(address));
            }
        });
    }
})();
