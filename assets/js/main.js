document.addEventListener('DOMContentLoaded', () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animatedElements = document.querySelectorAll('[data-animate]');
    const parallaxElements = document.querySelectorAll('[data-depth]');
    const nav = document.querySelector('.nav');
    const mobileMenu = document.getElementById('mobileMenu');
    const navToggle = document.querySelector('.nav__toggle');
    const marqueeTrack = document.querySelector('.marquee__track');
    const year = document.getElementById('year');
    const preloader = document.getElementById('preloader');
    const body = document.body;
    const typedElement = document.querySelector('.typed');

    if (year) {
        year.textContent = new Date().getFullYear();
    }

    if (animatedElements.length && !prefersReducedMotion) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.25,
            rootMargin: '0px 0px -10% 0px'
        });

        animatedElements.forEach((element) => revealObserver.observe(element));

        // Fallback: if for any reason an element in viewport wasn't revealed (e.g., observer glitch),
        // force reveal once after load and on first scroll.
        const forceRevealInView = () => {
            animatedElements.forEach((el) => {
                if (el.classList.contains('is-visible')) return;
                const rect = el.getBoundingClientRect();
                const inView = rect.top < (window.innerHeight * 0.98) && rect.bottom > 0;
                if (inView) el.classList.add('is-visible');
            });
        };
        window.addEventListener('load', () => setTimeout(forceRevealInView, 400), { once: true });
        window.addEventListener('scroll', forceRevealInView, { passive: true, once: true });
    } else {
        animatedElements.forEach((element) => element.classList.add('is-visible'));
    }

    const updateNavState = () => {
        if (!nav) return;
        const sticky = window.scrollY > 32;
        nav.classList.toggle('is-sticky', sticky);
    };

    updateNavState();
    window.addEventListener('scroll', updateNavState, { passive: true });

    if (navToggle && mobileMenu) {
        navToggle.addEventListener('click', () => {
            const expanded = navToggle.getAttribute('aria-expanded') === 'true';
            navToggle.setAttribute('aria-expanded', String(!expanded));
            if (expanded) {
                mobileMenu.setAttribute('hidden', '');
            } else {
                mobileMenu.removeAttribute('hidden');
            }
        });

        mobileMenu.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => {
                navToggle.setAttribute('aria-expanded', 'false');
                mobileMenu.setAttribute('hidden', '');
            });
        });
    }

    // Mobile nav: toggle + overlay + accessibility
    const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
    const header = document.getElementById('header');
    const main = document.querySelector('main');
    let overlay = document.querySelector('.mobile-nav-overlay');

    // Create overlay if not present
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'mobile-nav-overlay';
        document.body.appendChild(overlay);
    }

    const focusableSelectors = [
        'a[href]', 'area[href]', 'button:not([disabled])', 'input:not([disabled])',
        'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'
    ];

    const getFocusable = (container) => {
        return Array.from(container.querySelectorAll(focusableSelectors.join(',')))
            .filter(el => el.offsetParent !== null || el === document.activeElement);
    };

    const setAriaExpanded = (el, expanded) => {
        try {
            el.setAttribute('aria-expanded', String(expanded));
            if (!el.getAttribute('aria-controls')) el.setAttribute('aria-controls', 'header');
        } catch {}
    };

    const openMobileNav = () => {
        if (!header) return;
        // Prevent scroll jump
        const scrollY = window.scrollY;
        header.classList.add('expanded');
        document.body.classList.add('mobile-nav-active');
        overlay.classList.add('is-active');
        if (mobileNavToggle) setAriaExpanded(mobileNavToggle, true);
        // Restore scroll position
        window.scrollTo(0, scrollY);

        // Focus trap
        const focusables = getFocusable(header);
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (first) first.focus({ preventScroll: true });

        const trap = (e) => {
            if (e.key === 'Tab' && focusables.length) {
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault(); last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault(); first.focus();
                }
            } else if (e.key === 'Escape') {
                closeMobileNav();
            }
        };
        header.addEventListener('keydown', trap);
        header._trapHandler = trap;
    };

    const closeMobileNav = () => {
        if (!header) return;
        header.classList.remove('expanded');
        document.body.classList.remove('mobile-nav-active');
        overlay.classList.remove('is-active');
        if (mobileNavToggle) {
            setAriaExpanded(mobileNavToggle, false);
            mobileNavToggle.focus({ preventScroll: true });
        }
        if (header._trapHandler) {
            header.removeEventListener('keydown', header._trapHandler);
            header._trapHandler = null;
        }
    };

    if (mobileNavToggle && header) {
        setAriaExpanded(mobileNavToggle, false);
        mobileNavToggle.addEventListener('click', () => {
            if (header.classList.contains('expanded')) {
                closeMobileNav();
            } else {
                openMobileNav();
            }
        });
    }

    // Close on overlay click
    overlay.addEventListener('click', closeMobileNav);

    // Close when clicking a nav link inside header
    if (header) {
        header.querySelectorAll('.nav-menu a').forEach((a) => a.addEventListener('click', closeMobileNav));
    }

    // Disable auto-hide/slide on scroll; nav opens/closes only via the toggle
    // If any previous transform was applied, ensure it's reset
    if (header) header.style.transform = '';

    if (parallaxElements.length && !prefersReducedMotion) {
        const lerp = (start, end, amt) => (1 - amt) * start + amt * end;
        const state = { x: 0, y: 0, targetX: 0, targetY: 0 };

        const pointerHandler = (event) => {
            const { innerWidth, innerHeight } = window;
            const x = (event.clientX / innerWidth - 0.5) * 2;
            const y = (event.clientY / innerHeight - 0.5) * 2;
            state.targetX = x;
            state.targetY = y;
        };

        const animateParallax = () => {
            state.x = lerp(state.x, state.targetX, 0.08);
            state.y = lerp(state.y, state.targetY, 0.08);

            parallaxElements.forEach((element) => {
                const depth = parseFloat(element.dataset.depth || '0');
                element.style.transform = `translate3d(${state.x * depth * 30}px, ${state.y * depth * 30}px, 0)`;
            });

            requestAnimationFrame(animateParallax);
        };

        window.addEventListener('pointermove', pointerHandler);
        animateParallax();
    }

    if (marqueeTrack && prefersReducedMotion) {
        marqueeTrack.style.animation = 'none';
    }

    if (typedElement) {
        const itemsAttr = typedElement.dataset.typedItems || '';
        const marker = "I'm a product designer";
        let phrases = [];

        if (itemsAttr) {
            const markerIndex = itemsAttr.toLowerCase().indexOf(marker.toLowerCase());

            if (markerIndex >= 0) {
                const leadingPart = itemsAttr.slice(0, markerIndex);
                const trailingPart = itemsAttr.slice(markerIndex);

                phrases = leadingPart.split(',').map((entry) => entry.trim()).filter(Boolean);
                phrases.push(trailingPart.trim());
            } else {
                phrases = itemsAttr.split(',').map((entry) => entry.trim()).filter(Boolean);
            }
        }

        const sanitizedPhrases = phrases.map((phrase) => {
            if (/^I['’]m a\s+/i.test(phrase)) {
                return phrase.replace(/^I['’]m a\s+/i, '').trim();
            }
            return phrase;
        }).filter(Boolean);

        if (sanitizedPhrases.length) {
            typedElement.textContent = '';

            if (window.Typed) {
                new Typed('.typed', {
                    strings: sanitizedPhrases,
                    typeSpeed: 100,
                    backSpeed: 50,
                    backDelay: 1500,
                    loop: true,
                    smartBackspace: true,
                    cursorChar: '|'
                });
            } else {
                typedElement.textContent = sanitizedPhrases[0];
            }
        }
    }

    if (preloader) {
        window.addEventListener('load', () => {
            const finalizePreloader = () => {
                body.classList.add('is-loaded');
                preloader.classList.add('is-hidden');
                const removePreloader = () => preloader.remove();
                preloader.addEventListener('transitionend', removePreloader, { once: true });
                window.setTimeout(removePreloader, 900);
            };

            if (prefersReducedMotion) {
                finalizePreloader();
            } else {
                window.setTimeout(finalizePreloader, 280);
            }
        });
    } else {
        body.classList.add('is-loaded');
    }

    // Contact form: send to backend API (Telegram) with fallback to WhatsApp/Email
    const contactForm = document.getElementById('contact-form');
    const BACKEND_URL = 'https://your-backend-url.com'; // Update this with your deployed backend URL

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalText = submitBtn?.textContent || 'Send';
            
            const name = (document.getElementById('cf-name')?.value || '').trim();
            const email = (document.getElementById('cf-email')?.value || '').trim();
            const subject = (document.getElementById('cf-subject')?.value || '').trim();
            const message = (document.getElementById('cf-message')?.value || '').trim();
            const route = (document.getElementById('cf-route')?.value || 'telegram');

            if (!name || !message) {
                alert('Please provide your name and a message.');
                return;
            }

            // Try sending to backend (Telegram) first
            if (route === 'telegram') {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Sending...';
                }

                try {
                    const response = await fetch(`${BACKEND_URL}/api/contact`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, email, subject, message })
                    });

                    const result = await response.json();

                    if (result.success) {
                        alert('✅ Message sent successfully! I\'ll get back to you soon.');
                        contactForm.reset();
                    } else {
                        alert('❌ ' + (result.error || 'Failed to send. Please try again.'));
                    }
                } catch (err) {
                    console.error('Contact form error:', err);
                    alert('❌ Network error. Please try WhatsApp or Email instead.');
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                    }
                }
            } else if (route === 'email') {
                if (!email) {
                    alert('Please enter your email so I can reply.');
                    return;
                }
                const mailTo = 'mailto:sasuisaac332@gmail.com'
                    + '?subject=' + encodeURIComponent(subject || 'New message from portfolio')
                    + '&body=' + encodeURIComponent(
                        `Name: ${name}\nEmail: ${email}`
                        + (subject ? `\nSubject: ${subject}` : '')
                        + `\n\n${message}`
                    );
                window.location.href = mailTo;
            } else {
                // WhatsApp fallback
                const lines = [
                    'New message from portfolio',
                    `Name: ${name}`,
                    email ? `Email: ${email}` : null,
                    subject ? `Subject: ${subject}` : null,
                    '',
                    message
                ].filter(Boolean);
                const wa = 'https://wa.me/233201142183?text=' + encodeURIComponent(lines.join('\n'));
                window.open(wa, '_blank');
            }
        });
    }
});
