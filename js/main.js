/* ==========================================================================
   main.js — Shared behaviour for every page.
   Plain ES2018+, no dependencies, no build step.

   Modules (each one bails out quietly if its markup is absent):
     1. theme        light/dark switch, persisted, respects OS preference
     2. nav          sticky header state + mobile drawer
     3. reveal       fade-in on scroll via IntersectionObserver
     4. typewriter   cycling job titles in the hero
     5. skills       animate proficiency bars when scrolled into view
     6. filters      client-side project filtering
     7. contactForm  validation + hand-off to WhatsApp / email
     8. misc         footer year, back-to-top button
   ========================================================================== */

(function () {
    "use strict";

    var THEME_KEY = "may-portfolio-theme";
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function $(selector, scope) {
        return (scope || document).querySelector(selector);
    }

    function $$(selector, scope) {
        return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
    }

    /* ======================================================================
       1. Theme
       ====================================================================== */

    var Theme = {
        init: function () {
            var toggle = $(".theme-toggle");
            if (!toggle) return;

            toggle.addEventListener("click", function () {
                var next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
                Theme.apply(next, true);
            });

            // Follow the OS only while the visitor has not made a choice.
            window
                .matchMedia("(prefers-color-scheme: dark)")
                .addEventListener("change", function (event) {
                    if (!Theme.getStored()) Theme.apply(event.matches ? "dark" : "light", false);
                });
        },

        apply: function (theme, persist) {
            document.documentElement.setAttribute("data-theme", theme);
            var meta = $('meta[name="theme-color"]');
            if (meta) {
                meta.setAttribute("content", theme === "light" ? "#fbfbfc" : "#000000");
            }
            // Swap the cut-out logo so it stays legible on the new background.
            var logo = $("[data-logo-dark]");
            if (logo) {
                logo.setAttribute(
                    "src",
                    theme === "light" ? logo.getAttribute("data-logo-light") : logo.getAttribute("data-logo-dark")
                );
            }
            if (persist) {
                try {
                    window.localStorage.setItem(THEME_KEY, theme);
                } catch (error) {
                    /* Private mode / storage disabled — theme still works for this visit. */
                }
            }
        },

        getStored: function () {
            try {
                return window.localStorage.getItem(THEME_KEY);
            } catch (error) {
                return null;
            }
        }
    };

    /* ======================================================================
       2. Navigation
       ====================================================================== */

    var Nav = {
        init: function () {
            var header = $(".header");
            var toggle = $(".nav-toggle");
            var drawer = $(".nav");

            if (header) {
                var onScroll = function () {
                    header.classList.toggle("is-scrolled", window.scrollY > 12);
                };
                onScroll();
                window.addEventListener("scroll", onScroll, { passive: true });
            }

            if (toggle && drawer) {
                var setOpen = function (open) {
                    drawer.classList.toggle("is-open", open);
                    toggle.setAttribute("aria-expanded", String(open));
                };

                toggle.addEventListener("click", function () {
                    setOpen(toggle.getAttribute("aria-expanded") !== "true");
                });

                // Close after choosing a destination.
                $$("a", drawer).forEach(function (link) {
                    link.addEventListener("click", function () {
                        setOpen(false);
                    });
                });

                document.addEventListener("keydown", function (event) {
                    if (event.key === "Escape") setOpen(false);
                });

                document.addEventListener("click", function (event) {
                    if (!drawer.contains(event.target) && !toggle.contains(event.target)) setOpen(false);
                });

                window.addEventListener("resize", function () {
                    if (window.innerWidth > 800) setOpen(false);
                });
            }

            // Static hosting gives us no server-side active state, so derive it
            // from the current filename.
            var current = window.location.pathname.split("/").pop() || "index.html";
            $$(".nav__link[href]").forEach(function (link) {
                if (link.getAttribute("href").split("#")[0] === current) {
                    link.setAttribute("aria-current", "page");
                }
            });
        }
    };

    /* ======================================================================
       3. Scroll reveal
       ====================================================================== */

    var Reveal = {
        init: function () {
            var items = $$(".reveal");
            if (!items.length) return;

            if (reduceMotion || !("IntersectionObserver" in window)) {
                items.forEach(function (el) {
                    el.classList.add("is-visible");
                });
                return;
            }

            var observer = new IntersectionObserver(
                function (entries) {
                    entries.forEach(function (entry) {
                        if (!entry.isIntersecting) return;
                        entry.target.classList.add("is-visible");
                        observer.unobserve(entry.target);
                    });
                },
                { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
            );

            items.forEach(function (el, index) {
                // Stagger siblings slightly for a hand-off feel.
                if (!el.style.getPropertyValue("--reveal-delay")) {
                    var siblings = el.parentElement ? $$(".reveal", el.parentElement) : [];
                    var position = siblings.indexOf(el);
                    if (position > 0) el.style.setProperty("--reveal-delay", Math.min(position, 6) * 70 + "ms");
                    el.style.setProperty("--reveal-index", index);
                }
                observer.observe(el);
            });
        }
    };

    /* ======================================================================
       4. Typewriter (hero job titles)
       ====================================================================== */

    var Typewriter = {
        init: function () {
            var target = $("[data-typewriter]");
            if (!target) return;

            var roles = (target.getAttribute("data-roles") || "")
                .split("|")
                .map(function (role) {
                    return role.trim();
                })
                .filter(Boolean);
            if (!roles.length) return;

            if (reduceMotion) {
                target.textContent = roles[0];
                return;
            }

            var word = 0;
            var chars = 0;
            var deleting = false;

            var tick = function () {
                var role = roles[word];
                chars += deleting ? -1 : 1;
                target.textContent = role.slice(0, chars);

                var delay = deleting ? 45 : 85;

                if (!deleting && chars === role.length) {
                    deleting = true;
                    delay = 1700;
                } else if (deleting && chars === 0) {
                    deleting = false;
                    word = (word + 1) % roles.length;
                    delay = 320;
                }

                window.setTimeout(tick, delay);
            };

            target.textContent = "";
            window.setTimeout(tick, 320);
        }
    };

    /* ======================================================================
       5. Skill bars
       ====================================================================== */

    var Skills = {
        init: function () {
            var fills = $$("[data-skill-fill]");
            if (!fills.length) return;

            var apply = function (el) {
                // data-skill-fill is the single source of truth, e.g. data-skill-fill="88".
                var value = parseFloat(el.getAttribute("data-skill-fill"));
                if (isNaN(value)) value = 100;
                value = Math.min(100, Math.max(0, value));

                el.style.setProperty("--skill-width", value + "%");
                if (reduceMotion) {
                    el.classList.add("is-filled");
                    return;
                }
                // Force a reflow so the width transition has a start value to run from.
                void el.offsetWidth;
                el.classList.add("is-filled");
            };

            if (!("IntersectionObserver" in window)) {
                fills.forEach(apply);
                return;
            }

            var observer = new IntersectionObserver(
                function (entries) {
                    entries.forEach(function (entry) {
                        if (!entry.isIntersecting) return;
                        apply(entry.target);
                        observer.unobserve(entry.target);
                    });
                },
                { threshold: 0.4 }
            );

            fills.forEach(function (el) {
                observer.observe(el);
            });
        }
    };

    /* ======================================================================
       6. Portfolio filters
       ====================================================================== */

    var Filters = {
        init: function () {
            var controls = $$("[data-filter]");
            var grid = $("[data-work-grid]");
            if (!controls.length || !grid) return;

            var projects = $$("[data-category]", grid);
            var empty = $("[data-work-empty]");
            var counter = $("[data-work-count]");

            /* Derive the per-category counts from the markup so the pills can
               never drift out of sync when a project is added or removed. */
            controls.forEach(function (control) {
                var value = control.getAttribute("data-filter");
                var slot = $("[data-filter-count]", control);
                if (!slot) return;
                var matches =
                    value === "all"
                        ? projects.length
                        : projects.filter(function (project) {
                              return (project.getAttribute("data-category") || "").split(/\s+/).indexOf(value) !== -1;
                          }).length;
                slot.textContent = String(matches);
            });

            var apply = function (value) {
                var shown = 0;

                projects.forEach(function (project, index) {
                    var categories = (project.getAttribute("data-category") || "").split(/\s+/);
                    var match = value === "all" || categories.indexOf(value) !== -1;

                    project.hidden = !match;
                    if (match) {
                        shown += 1;
                        if (!reduceMotion) {
                            project.style.animationDelay = Math.min(shown, 8) * 45 + "ms";
                            // Restart the entry animation.
                            project.style.animation = "none";
                            void project.offsetWidth;
                            project.style.animation = "";
                        }
                    }
                    void index;
                });

                controls.forEach(function (control) {
                    control.setAttribute("aria-pressed", String(control.getAttribute("data-filter") === value));
                });

                if (empty) empty.classList.toggle("is-visible", shown === 0);
                if (counter) {
                    counter.textContent =
                        shown === projects.length
                            ? "Menampilkan seluruh " + projects.length + " project"
                            : "Menampilkan " + shown + " dari " + projects.length + " project";
                }
            };

            controls.forEach(function (control) {
                control.addEventListener("click", function () {
                    apply(control.getAttribute("data-filter"));
                });
            });

            // Pre-select the filter named in the query string, e.g. ?filter=laravel
            var requested = new URLSearchParams(window.location.search).get("filter");
            var known = controls.some(function (c) {
                return c.getAttribute("data-filter") === requested;
            });
            apply(known ? requested : "all");
        }
    };

    /* ======================================================================
       7. Contact form
       Validates in the browser, then hands the message to WhatsApp (primary)
       or the mail client (fallback). No backend required.
       ====================================================================== */

    var ContactForm = {
        init: function () {
            var form = $("[data-contact-form]");
            if (!form) return;

            var status = $("[data-form-status]", form);
            var message = $("#message", form);
            var counter = $("[data-char-counter]");

            /* --- Live character counter --- */
            if (message && counter) {
                var max = parseInt(message.getAttribute("maxlength"), 10) || 2000;
                var updateCount = function () {
                    counter.textContent = message.value.length + " / " + max;
                };
                message.addEventListener("input", updateCount);
                updateCount();
            }

            /* --- Helpers --- */
            var setFieldError = function (field, messageText) {
                var wrapper = field.closest(".field");
                var slot = wrapper ? $(".field__error", wrapper) : null;
                if (wrapper) wrapper.classList.toggle("has-error", Boolean(messageText));
                if (slot) slot.textContent = messageText || "";
                field.setAttribute("aria-invalid", messageText ? "true" : "false");
            };

            var setStatus = function (state, text) {
                if (!status) return;
                status.className = "form__status" + (state ? " is-visible is-" + state : "");
                status.textContent = text;
            };

            var validate = function (field, test) {
                var value = field.value.trim();
                if (!value) {
                    setFieldError(field, "Wajib diisi.");
                    return false;
                }
                var error = test(value);
                setFieldError(field, error || "");
                return !error;
            };

            var rules = {
                name: function (value) {
                    return value.length >= 2 ? "" : "Nama minimal 2 karakter.";
                },
                email: function (value) {
                    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) ? "" : "Format email belum benar.";
                },
                subject: function (value) {
                    return value.length >= 3 ? "" : "Subjek minimal 3 karakter.";
                },
                message: function (value) {
                    return value.length >= 10 ? "" : "Pesan minimal 10 karakter.";
                }
            };

            /* --- Clear the error as soon as the field becomes valid --- */
            $$(".field__control", form).forEach(function (field) {
                field.addEventListener("input", function () {
                    if (field.closest(".field").classList.contains("has-error") && rules[field.id]) {
                        setFieldError(field, rules[field.id](field.value.trim()));
                    }
                });
            });

            /* --- Submit --- */
            form.addEventListener("submit", function (event) {
                event.preventDefault();

                var fields = ["name", "email", "subject", "message"].map(function (id) {
                    return document.getElementById(id);
                });

                var firstInvalid = null;
                fields.forEach(function (field) {
                    if (!field) return;
                    var ok = validate(field, rules[field.id] || function () { return ""; });
                    if (!ok && !firstInvalid) firstInvalid = field;
                });

                if (firstInvalid) {
                    setStatus("error", "Ada beberapa kolom yang perlu diperbaiki sebelum dikirim.");
                    firstInvalid.focus();
                    return;
                }

                var name = document.getElementById("name").value.trim();
                var email = document.getElementById("email").value.trim();
                var subject = document.getElementById("subject").value.trim();
                var body = document.getElementById("message").value.trim();

                var text =
                    "Halo Afiq, saya " + name + " ingin menghubungi Anda.\n\n" +
                    "Subjek: " + subject + "\n\n" +
                    body + "\n\n" +
                    "Email saya: " + email;

                var channel = form.getAttribute("data-channel") || "whatsapp";

                if (channel === "whatsapp") {
                    // Digits only, no "+" — wa.me expects that format.
                    var phone = (form.getAttribute("data-phone") || "").replace(/\D/g, "");
                    window.open("https://wa.me/" + phone + "?text=" + encodeURIComponent(text), "_blank", "noopener");
                    setStatus(
                        "success",
                        "Terima kasih, " + name + "! Pesan Anda sudah dibuka di WhatsApp — tekan kirim untuk menyelesaikannya."
                    );
                } else {
                    window.location.href =
                        "mailto:" +
                        form.getAttribute("data-email") +
                        "?subject=" +
                        encodeURIComponent("[Portofolio] " + subject) +
                        "&body=" +
                        encodeURIComponent(text);
                    setStatus("success", "Aplikasi email Anda sudah dibuka dengan pesan yang terisi.");
                }

                form.reset();
                if (counter) counter.textContent = "0 / 2000";
                $$(".field", form).forEach(function (wrapper) {
                    wrapper.classList.remove("has-error");
                    var slot = $(".field__error", wrapper);
                    if (slot) slot.textContent = "";
                });
            });
        }
    };

    /* ======================================================================
       8. Odds and ends
       ====================================================================== */

    var Misc = {
        init: function () {
            $$("[data-year]").forEach(function (el) {
                el.textContent = String(new Date().getFullYear());
            });

            var toTop = $(".back-to-top");
            if (toTop) {
                var onScroll = function () {
                    toTop.classList.toggle("is-visible", window.scrollY > 520);
                };
                onScroll();
                window.addEventListener("scroll", onScroll, { passive: true });
                toTop.addEventListener("click", function () {
                    window.scrollTo({
                        top: 0,
                        behavior: reduceMotion ? "auto" : "smooth"
                    });
                });
            }
        }
    };

    /* ======================================================================
       Boot
       ====================================================================== */

    function init() {
        Theme.init();
        Nav.init();
        Reveal.init();
        Typewriter.init();
        Skills.init();
        Filters.init();
        ContactForm.init();
        Misc.init();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
