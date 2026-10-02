/* ==========================================================================
   main.js — Shared behaviour for every page.
   Plain ES2018+, no dependencies, no build step.

Modules (each one bails out quietly if its markup is absent):
      1. i18n         Indonesian/English switch, persisted
      2. theme        light/dark switch, persisted, respects OS preference
      3. nav          sticky header state + mobile drawer
      4. reveal       fade-in on scroll via IntersectionObserver
      5. typewriter   cycling job titles in the hero
      6. skills       animate proficiency bars when scrolled into view
      7. filters      client-side project filtering
      8. contactForm  validation + hand-off to WhatsApp / email
      9. misc         footer year, back-to-top button
    ====================================================================== */

    (function () {
"use strict";

    var THEME_KEY = "may-portfolio-theme";
    var LANG_KEY = "may-portfolio-lang";
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* Indonesian is the source language baked into the HTML. English lives in
       data-* attributes and is swapped in by I18n when the visitor asks for it. */
    var lang = "id";
    try {
        if (window.localStorage.getItem(LANG_KEY) === "en") lang = "en";
    } catch (error) {
        /* Storage disabled — Indonesian is a safe default. */
    }

    function $(selector, scope) {
        return (scope || document).querySelector(selector);
    }

    function $$(selector, scope) {
        return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
    }

    /* Picks the right string from an { id, en } pair. */
    function tr(pairs) {
        return (lang === "en" && pairs.en) ? pairs.en : pairs.id;
    }

    /* ======================================================================
       1. Theme
       ====================================================================== */

    var THEME_COLORS = { dark: "#000000", light: "#f2eee5" };

    var Theme = {
        init: function () {
            // The inline <head> script already picked the theme. Sync the logos
            // and browser chrome to it so a stored "light" doesn't keep a white logo.
            Theme.apply(document.documentElement.getAttribute("data-theme") || "dark", false);

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
            var color = THEME_COLORS[theme] || THEME_COLORS.dark;
            document.querySelectorAll('meta[name="theme-color"]').forEach(function (meta) {
                meta.setAttribute("content", color);
            });
            // Swap every cut-out logo (header and footer) so it stays legible.
            document.querySelectorAll("[data-logo-dark]").forEach(function (logo) {
                logo.setAttribute(
                    "src",
                    theme === "light" ? logo.getAttribute("data-logo-light") : logo.getAttribute("data-logo-dark")
                );
            });
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
        target: null,
        timer: null,

        roles: function () {
            var target = Typewriter.target;
            if (!target) return [];

            var source =
                lang === "en"
                    ? target.getAttribute("data-roles-en") || target.getAttribute("data-roles")
                    : target.getAttribute("data-roles");

            return (source || "")
                .split("|")
                .map(function (role) {
                    return role.trim();
                })
                .filter(Boolean);
        },

        init: function () {
            Typewriter.target = $("[data-typewriter]");
            Typewriter.start();
        },

        /* Restartable, so a language switch picks up the other set of roles. */
        start: function () {
            var target = Typewriter.target;
            if (!target) return;

            var roles = Typewriter.roles();
            if (!roles.length) return;

            window.clearTimeout(Typewriter.timer);

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

                Typewriter.timer = window.setTimeout(tick, delay);
            };

            target.textContent = "";
            Typewriter.timer = window.setTimeout(tick, 320);
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
        active: "all",

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

            var apply = function (value, silent) {
                Filters.active = value;
                var shown = 0;

                projects.forEach(function (project, index) {
                    var categories = (project.getAttribute("data-category") || "").split(/\s+/);
                    var match = value === "all" || categories.indexOf(value) !== -1;

                    project.hidden = !match;
                    if (match) {
                        shown += 1;
                        if (!reduceMotion && !silent) {
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
                            ? tr({
                                  id: "Menampilkan seluruh " + projects.length + " project",
                                  en: "Showing all " + projects.length + " projects"
                              })
                            : tr({
                                  id: "Menampilkan " + shown + " dari " + projects.length + " project",
                                  en: "Showing " + shown + " of " + projects.length + " projects"
                              });
                }
            };

            Filters.apply = apply;

            controls.forEach(function (control) {
                control.addEventListener("click", function () {
                    apply(control.getAttribute("data-filter"), false);
                });
            });

            // Pre-select the filter named in the query string, e.g. ?filter=laravel
            var requested = new URLSearchParams(window.location.search).get("filter");
            var known = controls.some(function (c) {
                return c.getAttribute("data-filter") === requested;
            });
            apply(known ? requested : "all", true);
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
            var errors = {};
            var lastStatus = null;

            var setFieldError = function (field, pairs) {
                var wrapper = field.closest(".field");
                var slot = wrapper ? $(".field__error", wrapper) : null;
                var messageText = pairs ? tr(pairs) : "";

                if (pairs) errors[field.id] = pairs;
                else delete errors[field.id];

                if (wrapper) wrapper.classList.toggle("has-error", Boolean(pairs));
                if (slot) slot.textContent = messageText;
                field.setAttribute("aria-invalid", pairs ? "true" : "false");
            };

            var setStatus = function (state, pairs) {
                if (!status) return;
                lastStatus = state ? { state: state, pairs: pairs } : null;
                status.className = "form__status" + (state ? " is-visible is-" + state : "");
                status.textContent = state ? tr(pairs) : "";
            };

            var validate = function (field, test) {
                var value = field.value.trim();
                if (!value) {
                    setFieldError(field, { id: "Wajib diisi.", en: "This field is required." });
                    return false;
                }
                var error = test(value);
                setFieldError(field, error || null);
                return !error;
            };

            var rules = {
                name: function (value) {
                    return value.length >= 2
                        ? ""
                        : { id: "Nama minimal 2 karakter.", en: "Name must be at least 2 characters." };
                },
                email: function (value) {
                    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
                        ? ""
                        : { id: "Format email belum benar.", en: "That email format is not valid." };
                },
                subject: function (value) {
                    return value.length >= 3
                        ? ""
                        : { id: "Subjek minimal 3 karakter.", en: "Subject must be at least 3 characters." };
                },
                message: function (value) {
                    return value.length >= 10
                        ? ""
                        : { id: "Pesan minimal 10 karakter.", en: "Message must be at least 10 characters." };
                }
            };

            ContactForm.rerender = function () {
                Object.keys(errors).forEach(function (id) {
                    var field = document.getElementById(id);
                    var slot = field ? $(".field__error", field.closest(".field")) : null;
                    if (slot) slot.textContent = tr(errors[id]);
                });
                if (lastStatus && status) status.textContent = tr(lastStatus.pairs);
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
                    setStatus("error", {
                        id: "Ada beberapa kolom yang perlu diperbaiki sebelum dikirim.",
                        en: "Please fix the highlighted fields before sending."
                    });
                    firstInvalid.focus();
                    return;
                }

                var name = document.getElementById("name").value.trim();
                var email = document.getElementById("email").value.trim();
                var subject = document.getElementById("subject").value.trim();
                var body = document.getElementById("message").value.trim();

                var text =
                    lang === "en"
                        ? "Hi Afiq, I would like to get in touch.\n\n" +
                          "Subject: " + subject + "\n\n" +
                          body + "\n\n" +
                          "My email: " + email
                        : "Halo Afiq, saya " + name + " ingin menghubungi Anda.\n\n" +
                          "Subjek: " + subject + "\n\n" +
                          body + "\n\n" +
                          "Email saya: " + email;

                var channel = form.getAttribute("data-channel") || "whatsapp";

                if (channel === "whatsapp") {
                    // Digits only, no "+" — wa.me expects that format.
                    var phone = (form.getAttribute("data-phone") || "").replace(/\D/g, "");
                    window.open("https://wa.me/" + phone + "?text=" + encodeURIComponent(text), "_blank", "noopener");
                    setStatus("success", {
                        id:
                            "Terima kasih, " + name + "! Pesan Anda sudah dibuka di WhatsApp — tekan kirim untuk menyelesaikannya.",
                        en:
                            "Thank you, " + name + "! Your message is open in WhatsApp — press send to finish."
                    });
                } else {
                    window.location.href =
                        "mailto:" +
                        form.getAttribute("data-email") +
                        "?subject=" +
                        encodeURIComponent("[Portofolio] " + subject) +
                        "&body=" +
                        encodeURIComponent(text);
                    setStatus("success", {
                        id: "Aplikasi email Anda sudah dibuka dengan pesan yang terisi.",
                        en: "Your email app is open with the message ready to send."
                    });
                }

                form.reset();
                if (counter) counter.textContent = "0 / 2000";
                errors = {};
                lastStatus = null;
                $$(".field", form).forEach(function (wrapper) {
                    wrapper.classList.remove("has-error");
                    var slot = $(".field__error", wrapper);
                    if (slot) slot.textContent = "";
                });
            });
        },

        /* Re-renders validation messages after a language switch. */
        rerender: function () {
            /* replaced during init when a form is present */
        }
    };

    /* ======================================================================
       8. Language
       Indonesian is baked into the HTML. English sits in data-* attributes
       and is swapped in here, so the Indonesian copy stays readable in the
       source and remains the fallback when JavaScript is unavailable.
       ====================================================================== */

    var I18n = {
        /* Attribute-driven translations, in the form [marker, real attribute]. */
        ATTRS: [
            ["data-en-alt", "alt"],
            ["data-en-aria", "aria-label"],
            ["data-en-ph", "placeholder"]
        ],

        /* The Indonesian copy lives in the markup, so it is captured once before the
           first swap. Without this, elements that contain markup (<strong>, <em>)
           would lose it permanently the first time English is applied. */
        originals: new WeakMap(),

        capture: function (el) {
            var record = I18n.originals.get(el);
            if (record) return record;

            record = { html: el.innerHTML, attrs: {} };
            I18n.ATTRS.forEach(function (pair) {
                record.attrs[pair[1]] = el.getAttribute(pair[1]);
            });
            I18n.originals.set(el, record);
            return record;
        },

        init: function () {
            var buttons = $$("[data-lang]");
            if (!buttons.length) return;

            var targets = $$("[data-en]");
            I18n.ATTRS.forEach(function (pair) {
                targets = targets.concat($$("[" + pair[0] + "]"));
            });
            targets.forEach(I18n.capture);

            buttons.forEach(function (button) {
                button.addEventListener("click", function () {
                    var next = button.getAttribute("data-lang") === "en" ? "en" : "id";
                    if (next === lang) return;
                    lang = next;
                    try {
                        window.localStorage.setItem(LANG_KEY, lang);
                    } catch (error) {
                        /* Storage disabled — the choice lasts for this visit only. */
                    }
                    I18n.apply();
                });
            });

            I18n.apply();
        },

        apply: function () {
            var en = lang === "en";
            document.documentElement.setAttribute("lang", lang);

            $$("[data-en]").forEach(function (el) {
                var record = I18n.capture(el);
                // textContent towards English keeps any markup in data-en unparsed;
                // innerHTML back to Indonesian restores the original <strong>/<em> nodes.
                if (en) el.textContent = el.getAttribute("data-en") || record.html;
                else el.innerHTML = record.html;
            });

            I18n.ATTRS.forEach(function (pair) {
                var marker = pair[0];
                var attribute = pair[1];
                $$("[" + marker + "]").forEach(function (el) {
                    var record = I18n.capture(el);
                    var value = en ? el.getAttribute(marker) : record.attrs[attribute];
                    if (value !== null) el.setAttribute(attribute, value);
                });
            });

            // Title and description live on <html> so the validator can still read a plain <title>.
            var root = document.documentElement;
            var idTitle = root.getAttribute("data-id-title");
            if (idTitle === null) {
                root.setAttribute("data-id-title", document.title);
                idTitle = document.title;
            }
            var enTitle = root.getAttribute("data-en-title");
            if (enTitle) document.title = en ? enTitle : idTitle;

            var idDesc = root.getAttribute("data-id-desc");
            var description = document.querySelector('meta[name="description"]');
            if (description) {
                if (idDesc === null) {
                    root.setAttribute("data-id-desc", description.getAttribute("content") || "");
                    idDesc = root.getAttribute("data-id-desc");
                }
                document.querySelectorAll('meta[name="description"]').forEach(function (meta) {
                    meta.setAttribute("content", en ? root.getAttribute("data-en-desc") || idDesc : idDesc);
                });
            }

            $$("[data-lang]").forEach(function (button) {
                button.setAttribute("aria-pressed", String(button.getAttribute("data-lang") === lang));
            });

            // Re-render anything the modules generated in the other language.
            if (Typewriter.target) Typewriter.start();
            if (Filters.apply) Filters.apply(Filters.active, true);
            if (typeof ContactForm.rerender === "function") ContactForm.rerender();
        }
    };

    /* ======================================================================
       9. Odds and ends
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
       9. Parallax
       ====================================================================== */

    var Parallax = {
        init: function () {
            if (reduceMotion) return;
            var root = document.documentElement;
            var ticking = false;
            var update = function () {
                ticking = false;
                root.style.setProperty("--scroll-shift", (-window.scrollY * 0.06).toFixed(2) + "px");
            };
            var onScroll = function () {
                if (ticking) return;
                ticking = true;
                window.requestAnimationFrame(update);
            };
            update();
            window.addEventListener("scroll", onScroll, { passive: true });
        }
    };

    /* ======================================================================
       Boot
       ====================================================================== */

    function init() {
        I18n.init();
        Theme.init();
        Nav.init();
        Reveal.init();
        Typewriter.init();
        Skills.init();
        Filters.init();
        ContactForm.init();
        Misc.init();
        Parallax.init();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
