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
    const toastRoot = document.getElementById('toast-root');

    const showToast = (message, type = 'info') => {
        const container = toastRoot || document.body;
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        // Trigger enter animation
        requestAnimationFrame(() => {
            toast.classList.add('is-visible');
        });

        const remove = () => {
            toast.remove();
        };

        window.setTimeout(() => {
            toast.classList.remove('is-visible');
            toast.addEventListener('transitionend', remove, { once: true });
        }, 3500);
    };

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

    // ── Load all site content from API ─────────────────────────────────
    fetch('/api/content')
        .then(r => r.json())
        .then(content => {
            // Hero
            const h = content.hero;
            if (h) {
                const nameEl = document.querySelector('.hero__name');
                if (nameEl && h.name) nameEl.textContent = h.name;
                const eyebrowEl = document.querySelector('.hero__eyebrow');
                if (eyebrowEl && h.eyebrow) eyebrowEl.textContent = h.eyebrow;
                const titleEl = document.querySelector('.hero__title');
                if (titleEl && h.title) {
                    // preserve accent span
                    const accent = titleEl.querySelector('.hero__title--accent');
                    if (!accent) titleEl.textContent = h.title;
                }
                const typedEl = document.querySelector('.typed');
                if (typedEl && h.typed_items && window.Typed) {
                    if (window._typedInstance) window._typedInstance.destroy();
                    window._typedInstance = new Typed('.typed', {
                        strings: h.typed_items, typeSpeed: 100, backSpeed: 50,
                        backDelay: 1500, loop: true, smartBackspace: true, cursorChar: '|'
                    });
                }
                if (h.stats) {
                    const statNums = document.querySelectorAll('.hero__stat-num');
                    const statLabels = document.querySelectorAll('.hero__stat-label');
                    h.stats.forEach((s, i) => {
                        if (statNums[i]) statNums[i].textContent = s.num;
                        if (statLabels[i]) statLabels[i].textContent = s.label;
                    });
                }
            }

            // CV button
            if (content.cv_url) {
                const cvBtn = document.querySelector('a[download]');
                if (cvBtn) cvBtn.href = content.cv_url;
            }

            // About
            const a = content.about;
            if (a) {
                const stmts = document.querySelectorAll('.about__statement p');
                if (a.bio) a.bio.forEach((text, i) => { if (stmts[i]) stmts[i].textContent = text; });
                const photo = document.querySelector('.about__avatar');
                if (photo && a.photo_url) photo.src = a.photo_url;
                const caption = document.querySelector('.about__avatar-caption');
                if (caption && a.caption) caption.textContent = a.caption;
            }

            // Capabilities
            if (Array.isArray(content.capabilities)) {
                const cards = document.querySelectorAll('.capability');
                content.capabilities.forEach((cap, i) => {
                    const card = cards[i];
                    if (!card) return;
                    const h3 = card.querySelector('h3');
                    const p  = card.querySelector('p');
                    const lis = card.querySelectorAll('li');
                    if (h3) h3.textContent = cap.title;
                    if (p)  p.textContent  = cap.desc;
                    if (cap.items) cap.items.forEach((item, j) => { if (lis[j]) lis[j].textContent = item; });
                });
            }

            // Resume
            const r = content.resume;
            if (r) {
                const summaryEl = document.querySelector('.resume__grid p');
                if (summaryEl && r.summary) summaryEl.textContent = r.summary;
                const metaItems = document.querySelectorAll('.resume__meta li');
                if (metaItems[0] && r.location) metaItems[0].innerHTML = `<strong>Location:</strong> ${r.location}`;
                if (metaItems[1] && r.email)    metaItems[1].innerHTML = `<strong>Email:</strong> <a href="mailto:${r.email}">${r.email}</a>`;

                const skillsList = document.getElementById('skills-list');
                if (skillsList && r.skills) {
                    skillsList.innerHTML = '';
                    r.skills.forEach(sk => {
                        const art = document.createElement('article');
                        art.className = 'skill';
                        art.innerHTML = `
                            <div class="skill__header">
                                <span class="skill__name">${sk.name}</span>
                                <span class="skill__value">${sk.value}%</span>
                            </div>
                            <div class="skill__bar" role="progressbar" aria-valuenow="${sk.value}" aria-valuemin="0" aria-valuemax="100">
                                <span class="skill__bar-fill" data-width="${sk.value}%"></span>
                            </div>`;
                        skillsList.appendChild(art);
                    });
                }
            }

            // Testimonials
            if (Array.isArray(content.testimonials)) {
                const grid = document.querySelector('.testimonials__grid');
                if (grid) {
                    grid.innerHTML = '';
                    content.testimonials.forEach(t => {
                        const bq = document.createElement('blockquote');
                        bq.className = 'testimonial';
                        bq.setAttribute('data-animate', 'fade-in');
                        bq.innerHTML = `<p>${t.quote}</p><footer class="testimonial__footer"><span class="testimonial__author">— ${t.author}</span></footer>`;
                        grid.appendChild(bq);
                    });
                }
            }
        })
        .catch(() => {}); // silently fall back to static HTML

    // ── Portfolio projects: load from API ──────────────────────────────
    const projectsList = document.querySelector('.projects__list');
    if (projectsList) {
        fetch('/api/projects')
            .then(r => r.json())
            .then(projects => {
                if (!Array.isArray(projects) || projects.length === 0) return; // keep static HTML fallback
                projectsList.innerHTML = '';
                projects.forEach(p => {
                    const tagsHtml = (p.tags || []).map(t => `<li>${t}</li>`).join('');
                    const article = document.createElement('article');
                    article.className = 'project project--image';
                    article.setAttribute('data-animate', 'reveal');
                    article.innerHTML = `
                        <a class="project__link-block" href="${p.project_url || '#'}" target="_blank" rel="noopener" aria-label="Open ${p.title}">
                            <img class="project__thumb" src="${p.image_url || ''}" alt="${p.title}" />
                            <div class="project__overlay">
                                <h3 class="project__title">${p.title}</h3>
                                ${p.description ? `<p class="project__desc">${p.description}</p>` : ''}
                                ${tagsHtml ? `<ul class="project__tags">${tagsHtml}</ul>` : ''}
                                <span class="project__open">View ↗</span>
                            </div>
                        </a>`;
                    projectsList.appendChild(article);
                    // Re-observe new elements for scroll animation
                    if (!prefersReducedMotion) {
                        const revealObs = new IntersectionObserver((entries) => {
                            entries.forEach(entry => {
                                if (entry.isIntersecting) {
                                    entry.target.classList.add('is-visible');
                                    revealObs.unobserve(entry.target);
                                }
                            });
                        }, { threshold: 0.15 });
                        revealObs.observe(article);
                    } else {
                        article.classList.add('is-visible');
                    }
                });
            })
            .catch(() => {}); // silently keep static HTML if API fails
    }

    // ── Skill bars: animate on scroll ──────────────────────────────────
    const skillsList = document.getElementById('skills-list');
    if (skillsList && !prefersReducedMotion) {
        const skillFills = skillsList.querySelectorAll('.skill__bar-fill[data-width]');
        const skillObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    skillFills.forEach((fill) => {
                        fill.style.width = fill.dataset.width;
                        fill.classList.add('is-animated');
                    });
                    skillObserver.disconnect();
                }
            });
        }, { threshold: 0.2 });
        skillObserver.observe(skillsList);
    } else if (skillsList) {
        skillsList.querySelectorAll('.skill__bar-fill[data-width]').forEach((fill) => {
            fill.style.width = fill.dataset.width;
        });
    }

    // ── GitHub repos: live fetch ────────────────────────────────────────
    const reposGrid = document.getElementById('repos-grid');
    const reposLoading = document.getElementById('repos-loading');
    const ghRepoCount = document.getElementById('gh-repo-count');
    const GITHUB_USER = 'sasusavage';

    const LANG_COLORS = {
        Python: '#3572A5', JavaScript: '#f1e05a', TypeScript: '#2b7489',
        HTML: '#e34c26', CSS: '#563d7c', 'C++': '#f34b7d', 'C#': '#178600',
        Java: '#b07219', Shell: '#89e051', Go: '#00ADD8', Rust: '#dea584',
    };

    const timeAgo = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const days = Math.floor(diff / 86400000);
        if (days === 0) return 'today';
        if (days === 1) return '1 day ago';
        if (days < 30) return `${days} days ago`;
        if (days < 365) return `${Math.floor(days / 30)} mo ago`;
        return `${Math.floor(days / 365)}y ago`;
    };

    if (reposGrid) {
        fetch(`https://api.github.com/users/${GITHUB_USER}/repos?sort=pushed&per_page=100&type=public`)
            .then((r) => r.json())
            .then((repos) => {
                if (!Array.isArray(repos)) throw new Error('Unexpected response');
                const filtered = repos.filter((r) => !r.fork).slice(0, 6);

                if (ghRepoCount) {
                    const total = repos.filter((r) => !r.fork).length;
                    ghRepoCount.textContent = total + '+';
                }

                if (reposLoading) reposLoading.remove();

                if (filtered.length === 0) {
                    reposGrid.innerHTML = '<p style="color:rgba(255,255,255,0.4);font-size:.9rem;">No public repositories found.</p>';
                    return;
                }

                filtered.forEach((repo) => {
                    const color = LANG_COLORS[repo.language] || '#8b949e';
                    const card = document.createElement('a');
                    card.className = 'repo-card';
                    card.href = repo.html_url;
                    card.target = '_blank';
                    card.rel = 'noopener';
                    card.setAttribute('aria-label', `GitHub repo: ${repo.name}`);
                    card.innerHTML = `
                        <div class="repo-card__name">
                            <i class='bx bx-git-repo-forked'></i>
                            ${repo.name}
                        </div>
                        <p class="repo-card__desc">${repo.description || 'No description provided.'}</p>
                        <div class="repo-card__meta">
                            ${repo.language ? `<span><span class="repo-card__lang-dot" style="background:${color}"></span>${repo.language}</span>` : ''}
                            <span><i class='bx bx-star'></i> ${repo.stargazers_count}</span>
                            <span><i class='bx bx-git-branch'></i> ${repo.forks_count}</span>
                            <span>Updated ${timeAgo(repo.pushed_at)}</span>
                        </div>`;
                    reposGrid.appendChild(card);
                });
            })
            .catch(() => {
                if (reposLoading) reposLoading.remove();
                reposGrid.innerHTML = '<p class="repos__error">Could not load repositories. <a href="https://github.com/sasusavage" target="_blank" rel="noopener" style="color:#3b7eff">View on GitHub ↗</a></p>';
            });
    }

    // Contact form: send to backend API (Telegram)
    const contactForm = document.getElementById('contact-form');
    // Use relative URL so frontend and backend work together on the same domain
    const BACKEND_URL = '';

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalText = submitBtn?.textContent || 'Send Message';
            
            const name = (document.getElementById('cf-name')?.value || '').trim();
            const email = (document.getElementById('cf-email')?.value || '').trim();
            const phone = (document.getElementById('cf-phone')?.value || '').trim();
            const subject = (document.getElementById('cf-subject')?.value || '').trim();
            const message = (document.getElementById('cf-message')?.value || '').trim();

            if (!name || !message) {
                showToast('Please provide your name and a message.', 'error');
                return;
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending...';
            }

            try {
                const response = await fetch(`${BACKEND_URL}/api/contact`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, phone, subject, message })
                });

                const result = await response.json();

                if (result.success) {
                    showToast('Message sent successfully! I will get back to you soon.', 'success');
                    contactForm.reset();
                } else {
                    showToast(result.error || 'Failed to send. Please try again.', 'error');
                }
            } catch (err) {
                console.error('Contact form error:', err);
                showToast('Network error. Please try again later.', 'error');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            }
        });
    }
});
