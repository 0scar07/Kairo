(function () {
  "use strict";

  var data = window.__BRAND__ || {};
  var root = document.documentElement;
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fineHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

  function $(sel, scope) { return (scope || document).querySelector(sel); }
  function $$(sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); }
  function safe(fn, name) { try { fn(); } catch (e) { console.warn("[" + name + "]", e); } }

  /* ---------- Splash ---------- */
  function initSplash() {
    var splash = $("[data-splash]");
    var done = false;
    function hide() {
      if (done) return;
      done = true;
      if (splash) splash.classList.add("is-out");
      root.classList.add("is-ready");
    }
    setTimeout(hide, reduced ? 250 : 950);
    setTimeout(hide, 4000); // red de seguridad adicional
  }

  /* ---------- Navegación ---------- */
  function initNav() {
    var nav = $("[data-nav]");
    var toggle = $("[data-nav-toggle]");
    if (!nav) return;

    function onScroll() { nav.classList.toggle("is-scrolled", window.scrollY > 12); }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    function close() {
      nav.classList.remove("is-open");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    }
    if (toggle) {
      toggle.addEventListener("click", function () {
        var open = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
    $$(".nav-links a", nav).forEach(function (a) { a.addEventListener("click", close); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    document.addEventListener("click", function (e) { if (!nav.contains(e.target)) close(); });

    // Enlace activo según la sección visible
    var links = $$(".nav-links a[href^='#']", nav);
    var map = {};
    links.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var link = map[en.target.id];
        if (!link) return;
        if (en.isIntersecting) {
          links.forEach(function (l) { l.classList.remove("is-current"); });
          link.classList.add("is-current");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------- Reveal al hacer scroll ---------- */
  function initReveals() {
    var els = $$("[data-reveal]");
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-revealed"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-revealed"); io.unobserve(e.target); }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -6% 0px" });
    els.forEach(function (el) { io.observe(el); });

    // Red de seguridad: a los 6 s se muestra lo que ya esté en pantalla
    setTimeout(function () {
      $$("[data-reveal]:not(.is-revealed)").forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("is-revealed");
      });
    }, 6000);
  }

  /* ---------- Degradado del hero que sigue al cursor ---------- */
  function initHeroGradient() {
    var hero = $("[data-hero]");
    if (!hero || !fineHover || reduced) return;
    var mx = 68, my = 40, tx = 68, ty = 40, raf = null;
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 100;
      ty = ((e.clientY - r.top) / r.height) * 100;
      if (!raf) raf = requestAnimationFrame(frame);
    });
    function frame() {
      mx += (tx - mx) * 0.07;
      my += (ty - my) * 0.07;
      hero.style.setProperty("--mx", mx.toFixed(2) + "%");
      hero.style.setProperty("--my", my.toFixed(2) + "%");
      raf = (Math.abs(tx - mx) > 0.1 || Math.abs(ty - my) > 0.1) ? requestAnimationFrame(frame) : null;
    }
  }

  /* ---------- Teléfono 3D del hero (profundidad por capas) ---------- */
  function initHeroStage() {
    var stage = $("[data-stage]");
    var hero = $("[data-hero]");
    if (!stage || !hero || !fineHover || reduced) return;
    var layers = $$("[data-depth]", stage);
    var main = $(".phone-main", stage);
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;

    hero.addEventListener("pointermove", function (e) {
      tx = (e.clientX / window.innerWidth) - 0.5;
      ty = (e.clientY / window.innerHeight) - 0.5;
      if (!raf) raf = requestAnimationFrame(loop);
    });
    hero.addEventListener("pointerleave", function () {
      tx = 0; ty = 0;
      if (!raf) raf = requestAnimationFrame(loop);
    });
    function loop() {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      layers.forEach(function (el) {
        var d = parseFloat(el.getAttribute("data-depth")) || 1;
        el.style.setProperty("--px", (cx * 22 * d).toFixed(2) + "px");
        el.style.setProperty("--py", (cy * 18 * d).toFixed(2) + "px");
      });
      if (main) {
        main.style.setProperty("--ry", (-8 + cx * 16).toFixed(2) + "deg");
        main.style.setProperty("--rx", (4 - cy * 10).toFixed(2) + "deg");
      }
      raf = (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) ? requestAnimationFrame(loop) : null;
    }
  }

  /* ---------- Parallax suave del hero al hacer scroll (GSAP) ---------- */
  function initHeroScroll() {
    if (!window.gsap || !window.ScrollTrigger || reduced) return;
    gsap.to(".hero-stage", {
      yPercent: -8, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
    });
    gsap.to(".hero-copy", {
      yPercent: -10, opacity: 0.2, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "center top", end: "bottom top", scrub: true }
    });
  }

  /* ---------- Franja de juegos ---------- */
  function initMarquee() {
    var marquee = $("[data-marquee]");
    var track = $("[data-marquee-track]");
    if (!marquee || !track || reduced) return;
    if (track.getAttribute("data-cloned")) return; // idempotente
    track.setAttribute("data-cloned", "1");
    $$(".game", track).forEach(function (item) {
      var clone = item.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      track.appendChild(clone);
    });
    var w = track.scrollWidth / 2;
    marquee.style.setProperty("--marquee-dur", Math.max(28, w / 45).toFixed(1) + "s");
    marquee.classList.add("is-running");
  }

  /* ---------- Brillo que sigue al cursor en las tarjetas ---------- */
  function initCardGlow() {
    if (!fineHover) return;
    $$("[data-glow]").forEach(function (card) {
      if (card.getAttribute("data-glow-bound")) return;
      card.setAttribute("data-glow-bound", "1");
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - r.left) + "px");
        card.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  /* ---------- Tilt 3D en los teléfonos de las filas ---------- */
  function initTilt() {
    if (!fineHover) return;
    $$("[data-tilt]").forEach(function (el) {
      var MAX = 8, tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
      var zone = el.parentElement || el;
      zone.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        tx = -py * MAX; ty = px * MAX;
        if (!raf) raf = requestAnimationFrame(loop);
      });
      zone.addEventListener("pointerleave", function () {
        tx = 0; ty = 0;
        if (!raf) raf = requestAnimationFrame(loop);
      });
      function loop() {
        cx += (tx - cx) * 0.14; cy += (ty - cy) * 0.14;
        el.style.setProperty("--rx", cx.toFixed(2) + "deg");
        el.style.setProperty("--ry", cy.toFixed(2) + "deg");
        raf = (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) ? requestAnimationFrame(loop) : null;
      }
    });
  }

  /* ---------- Partida en vivo: storytelling al hacer scroll ---------- */
  function initLive() {
    var section = $("[data-live]");
    var stage = $("[data-live-stage]");
    var steps = $$("[data-live-step]");
    var clock = $("[data-live-clock]");
    if (!section || !stage || !steps.length) return;

    function setStep(n) {
      stage.setAttribute("data-step", n);
      steps.forEach(function (s) { s.classList.toggle("is-active", s.getAttribute("data-live-step") === n); });
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) setStep(en.target.getAttribute("data-live-step"));
      });
    }, { rootMargin: "-48% 0px -48% 0px", threshold: 0 });
    steps.forEach(function (s) { io.observe(s); });

    // Cronómetro que corre mientras la sección está en pantalla
    if (!clock) return;
    var secs = typeof data.liveClockStart === "number" ? data.liveClockStart : 1286;
    var timer = null;
    function tick() {
      secs += 1;
      var m = Math.floor(secs / 60), s = secs % 60;
      clock.textContent = m + ":" + (s < 10 ? "0" : "") + s;
    }
    var vis = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && !timer) timer = setInterval(tick, 1000);
        if (!en.isIntersecting && timer) { clearInterval(timer); timer = null; }
      });
    }, { threshold: 0 });
    vis.observe(section);
  }

  /* ---------- Galería ---------- */
  function initGallery() {
    var track = $("[data-gallery]");
    var prev = $("[data-gallery-prev]");
    var next = $("[data-gallery-next]");
    if (!track || !prev || !next) return;
    function step() {
      var shot = $(".shot", track);
      return shot ? (shot.getBoundingClientRect().width + 24) * 2 : 400;
    }
    function update() {
      var max = track.scrollWidth - track.clientWidth - 4;
      prev.disabled = track.scrollLeft <= 4;
      next.disabled = track.scrollLeft >= max;
    }
    var behavior = reduced ? "auto" : "smooth";
    prev.addEventListener("click", function () { track.scrollBy({ left: -step(), behavior: behavior }); });
    next.addEventListener("click", function () { track.scrollBy({ left: step(), behavior: behavior }); });
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();

    // Arrastrar con el mouse (en táctil ya funciona el scroll nativo)
    if (!fineHover) return;
    var down = false, startX = 0, startLeft = 0, moved = false;
    track.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse") return;
      down = true; moved = false; startX = e.clientX; startLeft = track.scrollLeft;
      track.style.scrollSnapType = "none";
    });
    window.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      track.scrollLeft = startLeft - dx;
    });
    window.addEventListener("pointerup", function () {
      if (!down) return;
      down = false;
      track.style.scrollSnapType = "";
    });
    track.addEventListener("click", function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
    track.addEventListener("dragstart", function (e) { e.preventDefault(); });
  }

  /* ---------- Contadores ---------- */
  function initCounters() {
    var els = $$("[data-count]");
    if (!els.length || reduced) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var el = en.target, end = parseInt(el.getAttribute("data-count"), 10) || 0, t0 = null;
        function frame(t) {
          if (!t0) t0 = t;
          var p = Math.min((t - t0) / 1100, 1);
          el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(frame);
        }
        setTimeout(function () { requestAnimationFrame(frame); }, 900);
      });
    }, { threshold: 0.01 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Varios ---------- */
  function initYear() {
    var y = $("[data-year]");
    if (y) y.textContent = String(new Date().getFullYear());
  }

  function boot() {
    root.classList.add("is-booted");
    safe(initSplash, "initSplash");
    safe(initNav, "initNav");
    safe(initReveals, "initReveals");
    safe(initHeroGradient, "initHeroGradient");
    safe(initHeroStage, "initHeroStage");
    safe(initMarquee, "initMarquee");
    safe(initCardGlow, "initCardGlow");
    safe(initTilt, "initTilt");
    safe(initLive, "initLive");
    safe(initGallery, "initGallery");
    safe(initCounters, "initCounters");
    safe(initYear, "initYear");

    if (window.gsap && window.ScrollTrigger) {
      try { gsap.registerPlugin(ScrollTrigger); } catch (_) {}
      safe(initHeroScroll, "initHeroScroll");
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
