(function () {
  "use strict";

  var data = window.__BRAND__ || {};
  var root = document.documentElement;
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fineHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

  function $(sel, scope) { return (scope || document).querySelector(sel); }
  function $$(sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); }
  function safe(fn, name) { try { fn(); } catch (e) { console.warn("[" + name + "]", e); } }

  /* ---------- Entrada (sin pantalla de carga: el contenido aparece ya) ---------- */
  function initReady() {
    requestAnimationFrame(function () { root.classList.add("is-ready"); });
  }

  /* ---------- Navegación ---------- */
  function initNav() {
    var nav = $("[data-nav]");
    var toggle = $("[data-nav-toggle]");
    if (!nav) return;

    // Se esconde al bajar (más espacio para el contenido) y vuelve al subir
    var lastY = window.scrollY;
    function onScroll() {
      var y = window.scrollY;
      nav.classList.toggle("is-scrolled", y > 12);
      var down = y > lastY + 4, up = y < lastY - 4;
      if (down && y > 700 && !nav.classList.contains("is-open") && !nav.contains(document.activeElement)) nav.classList.add("is-hidden");
      else if (up || y <= 700) nav.classList.remove("is-hidden");
      if (down || up) lastY = y;
    }
    nav.addEventListener("focusin", function () { nav.classList.remove("is-hidden"); });
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
          links.forEach(function (l) { l.classList.remove("is-current"); l.removeAttribute("aria-current"); });
          link.classList.add("is-current");
          link.setAttribute("aria-current", "true");
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

  /* ---------- Titulares que entran por líneas ----------
     Se parte el texto en palabras, se agrupan por línea visual y cada
     línea sube desde una máscara. Al terminar se restaura el HTML
     original, así el titular se vuelve a ajustar solo si cambia el ancho. */
  function initLines() {
    var els = $$("[data-lines]");
    if (!els.length || reduced || !("IntersectionObserver" in window)) return;

    function wrap(node) {
      var w = document.createElement("span");
      w.style.display = "inline-block";
      w.appendChild(node);
      return w;
    }

    function split(el) {
      var original = el.innerHTML;
      var label = el.textContent.replace(/\s+/g, " ").trim();
      var tokens = [];
      Array.prototype.slice.call(el.childNodes).forEach(function (node) {
        if (node.nodeType === 3) {
          node.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            tokens.push(/^\s+$/.test(part) ? document.createTextNode(" ") : wrap(document.createTextNode(part)));
          });
        } else {
          tokens.push(wrap(node.cloneNode(true)));
        }
      });

      el.textContent = "";
      tokens.forEach(function (t) { el.appendChild(t); });

      // Agrupa las palabras por su posición vertical
      var lines = [], lastTop = null;
      tokens.forEach(function (t) {
        if (t.nodeType === 3) { if (lines.length) lines[lines.length - 1].push(t); return; }
        var top = t.offsetTop;
        if (lastTop === null || Math.abs(top - lastTop) > 4) { lines.push([]); lastTop = top; }
        lines[lines.length - 1].push(t);
      });

      el.textContent = "";
      lines.forEach(function (group, i) {
        while (group.length && group[group.length - 1].nodeType === 3) group.pop();
        var line = document.createElement("span");
        line.className = "line";
        line.setAttribute("aria-hidden", "true");
        var inner = document.createElement("span");
        inner.style.setProperty("--i", i);
        group.forEach(function (t) { inner.appendChild(t); });
        line.appendChild(inner);
        el.appendChild(line);
        if (i < lines.length - 1) el.appendChild(document.createTextNode(" "));
      });
      el.setAttribute("aria-label", label);
      return { original: original, count: lines.length };
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var el = en.target, info = el.__lines;
        requestAnimationFrame(function () { el.classList.add("lines-in"); });
        setTimeout(function () {
          el.innerHTML = info.original;
          el.removeAttribute("aria-label");
          el.classList.remove("lines-in");
        }, 1050 + info.count * 85 + 250);
      });
    }, { threshold: 0.2, rootMargin: "0px 0px -8% 0px" });

    function go() {
      els.forEach(function (el) {
        safe(function () { el.__lines = split(el); io.observe(el); }, "initLines");
      });
    }
    // El corte de línea depende de la fuente: esperar a que cargue
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go, go);
    else go();
  }

  /* ---------- Escenas de scroll (GSAP + ScrollTrigger) ---------- */
  function initScrollScenes() {
    if (!window.gsap || !window.ScrollTrigger || reduced) return;

    // El teléfono del hero se endereza y crece mientras entra
    gsap.fromTo(".hero-stage",
      { scale: 0.9, rotateX: 14, y: 30 },
      { scale: 1, rotateX: 0, y: 0, ease: "none",
        scrollTrigger: { trigger: ".hero-stage", start: "top 92%", end: "top 30%", scrub: 0.6 } });

    // El texto del hero se desvanece al salir
    gsap.to(".hero-copy", {
      opacity: 0, y: -40, ease: "none",
      scrollTrigger: { trigger: ".hero-copy", start: "top top+=60", end: "bottom top", scrub: true }
    });

    // Capturas de las filas: suben y crecen con el scroll
    $$(".row .phone-tilt").forEach(function (el) {
      gsap.fromTo(el, { y: 70, scale: 0.92 }, {
        y: -30, scale: 1, ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "bottom 35%", scrub: 0.6 }
      });
    });

    // Abanico multijuego: los tres teléfonos se separan al llegar
    var fan = $(".row-fan");
    if (fan) {
      gsap.timeline({ scrollTrigger: { trigger: fan, start: "top 85%", end: "center 50%", scrub: 0.6 } })
        .fromTo(".fan-l", { x: 0, xPercent: -14, rotation: -2, scale: 0.8 }, { x: 0, xPercent: -52, rotation: -8, scale: 0.86, ease: "none" }, 0)
        .fromTo(".fan-r", { x: 0, xPercent: 14, rotation: 2, scale: 0.8 }, { x: 0, xPercent: 52, rotation: 8, scale: 0.86, ease: "none" }, 0)
        .fromTo(".fan-c", { y: 40 }, { y: 0, ease: "none" }, 0);
    }
  }

  /* ---------- Vuelo por las capturas ----------
     La sección se queda fija mientras se hace scroll; el progreso mueve
     una cámara en Z a través de las tarjetas (cada una GAP px más lejos).
     Las tarjetas se encienden al acercarse y se apagan al pasar de largo. */
  function initWorld() {
    var section = $("[data-world]");
    if (!section || reduced) return;
    var cam = $("[data-world-cam]", section);
    var cards = $$(".world-card", section);
    var intro = $("[data-world-intro]", section);
    var bar = $("[data-world-bar]", section);
    var caps = $$(".world-captions li", section);
    if (!cam || !cards.length) return;

    var GAP = 1000;
    var TOTAL = (cards.length - 1) * GAP;
    var START = 1800; // la cámara arranca por detrás de la primera tarjeta
    section.classList.add("is-live");
    cards.forEach(function (c, i) { c.style.setProperty("--z", (-i * GAP) + "px"); });

    var raf = null, active = -1;
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function frame() {
      raf = null;
      var r = section.getBoundingClientRect();
      var span = section.offsetHeight - window.innerHeight;
      var p = clamp(-r.top / span, 0, 1);
      // El vuelo arranca cuando la intro ya se apagó
      var t = clamp((p - 0.08) / 0.92, 0, 1);
      var camZ = t * (TOTAL + START) - START;
      var dim = clamp(p / 0.09, 0, 1) * 0.65 + 0.35; // tenues mientras se lee la intro
      var sway = Math.sin(t * Math.PI * 2) * 3;
      cam.style.transform = "translate3d(0,0," + camZ.toFixed(1) + "px) rotateY(" + sway.toFixed(2) + "deg)";

      cards.forEach(function (c, i) {
        var eff = camZ - i * GAP; // 0 = tamaño natural, >0 = más cerca
        var o;
        if (eff < -4200) o = 0;
        else if (eff < -3000) o = (eff + 4200) / 1200;
        else if (eff < 250) o = 1;
        else if (eff < 750) o = 1 - (eff - 250) / 500;
        else o = 0;
        o *= dim;
        c.style.opacity = o.toFixed(3);
        c.style.visibility = o > 0 ? "visible" : "hidden";
      });

      if (intro) {
        var io = clamp(1 - p / 0.09, 0, 1);
        intro.style.opacity = io.toFixed(3);
        intro.style.transform = "translateY(-50%) scale(" + (1 + (1 - io) * 0.08).toFixed(3) + ")";
      }
      if (bar) bar.style.transform = "scaleX(" + t.toFixed(3) + ")";

      // Leyenda: la de la tarjeta más cercana a su tamaño natural
      var idx = -1;
      caps.forEach(function (li, k) {
        var at = parseInt(li.getAttribute("data-at"), 10) * GAP;
        if (camZ > at - 650 && (camZ < at + 450 || k === caps.length - 1)) idx = k;
      });
      if (idx !== active) {
        caps.forEach(function (li, k) { li.classList.toggle("is-on", k === idx); });
        if (idx >= 0) section.style.setProperty("--wt", caps[idx].style.getPropertyValue("--tint"));
        active = idx;
      }
    }
    function request() { if (!raf) raf = requestAnimationFrame(frame); }
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    frame();
  }

  /* ---------- Declaración: las palabras se encienden con el scroll ---------- */
  function initStatement() {
    var el = $("[data-statement]");
    if (!el || reduced) return;
    var words = [];
    function wrapText(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement("span");
            w.className = "w";
            w.textContent = part;
            words.push(w);
            frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) {
          wrapText(n);
        }
      });
    }
    wrapText(el);

    var raf = null;
    function frame() {
      raf = null;
      var r = el.getBoundingClientRect(), vh = window.innerHeight;
      // 0 cuando el texto asoma por abajo, 1 cuando su final llega al 45% de la pantalla
      var p = (vh * 0.85 - r.top) / (r.height + vh * 0.4);
      p = p < 0 ? 0 : p > 1 ? 1 : p;
      var lit = p * words.length;
      words.forEach(function (w, i) {
        var o = lit - i; o = o < 0 ? 0 : o > 1 ? 1 : o;
        w.style.setProperty("--o", (0.16 + o * 0.84).toFixed(3));
      });
    }
    function request() { if (!raf) raf = requestAnimationFrame(frame); }
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    frame();
  }

  /* ---------- Barra de descarga flotante (móvil) ----------
     Aparece al dejar atrás el hero y se oculta cuando ya hay botones de
     descarga en pantalla (sección Descargar y CTA final). */
  function initDock() {
    var dock = $("[data-dock]");
    var hero = $("[data-hero]");
    if (!dock || !hero || !("IntersectionObserver" in window)) return;
    var pastHero = false, blockers = new Set();
    function update() {
      var show = pastHero && blockers.size === 0;
      dock.classList.toggle("is-shown", show);
      if (show) dock.removeAttribute("inert"); else dock.setAttribute("inert", "");
    }
    new IntersectionObserver(function (en) {
      pastHero = !en[0].isIntersecting && en[0].boundingClientRect.top < 0;
      update();
    }, { threshold: 0 }).observe(hero);
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) blockers.add(e.target); else blockers.delete(e.target); });
      update();
    }, { threshold: 0 });
    $$("#descargar, .final, .footer").forEach(function (el) { io.observe(el); });
  }

  /* ---------- Galería: la captura central crece, las de los lados se apagan ---------- */
  function initCoverflow() {
    var track = $("[data-gallery]");
    if (!track || reduced) return;
    var shots = $$(".shot .phone", track);
    var raf = null;
    function frame() {
      raf = null;
      var tr = track.getBoundingClientRect();
      var mid = tr.left + tr.width / 2;
      shots.forEach(function (ph) {
        var r = ph.getBoundingClientRect();
        var d = Math.min(Math.abs(r.left + r.width / 2 - mid) / (tr.width * 0.6), 1);
        ph.style.transform = "scale(" + (1 - d * 0.1).toFixed(3) + ")";
        ph.style.opacity = (1 - d * 0.45).toFixed(3);
      });
    }
    function request() { if (!raf) raf = requestAnimationFrame(frame); }
    track.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    frame();
  }

  /* ---------- GitHub: última versión (hero) y estrellas (footer) ----------
     Se guarda en sessionStorage para no gastar el límite de la API pública
     (60 peticiones/hora por IP). Si algo falla, los elementos siguen ocultos. */
  var REPO = "0scar07/Kairo";
  var MIN_STARS_TO_SHOW = 10; // con pocas estrellas el número resta más de lo que suma

  function cachedJSON(key, url) {
    try {
      var hit = sessionStorage.getItem(key);
      if (hit) return Promise.resolve(JSON.parse(hit));
    } catch (_) {}
    return fetch(url, { headers: { Accept: "application/vnd.github+json" } })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error(r.status)); })
      .then(function (d) {
        try { sessionStorage.setItem(key, JSON.stringify(d)); } catch (_) {}
        return d;
      });
  }

  function relativeDays(iso) {
    var days = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
    var rtf = window.Intl && Intl.RelativeTimeFormat ? new Intl.RelativeTimeFormat("es", { numeric: "auto" }) : null;
    if (!rtf) return days + " días";
    if (days < 30) return rtf.format(-days, "day");
    if (days < 365) return rtf.format(-Math.round(days / 30), "month");
    return rtf.format(-Math.round(days / 365), "year");
  }

  function initGitHub() {
    if (!window.fetch) return;
    var pill = $("[data-release]");
    if (pill) {
      cachedJSON("kairo:release", "https://api.github.com/repos/" + REPO + "/releases/latest").then(function (rel) {
        if (!rel || !rel.tag_name) return;
        var days = (Date.now() - new Date(rel.published_at).getTime()) / 86400000;
        $("[data-release-tag]", pill).textContent = days <= 30 ? "Nuevo" : "Versión";
        $("[data-release-text]", pill).textContent = rel.tag_name + " · " + relativeDays(rel.published_at);
        if (rel.html_url) pill.href = rel.html_url;
        pill.hidden = false;
      }).catch(function () {});
    }
    var count = $("[data-stars-count]");
    if (count) {
      cachedJSON("kairo:repo", "https://api.github.com/repos/" + REPO).then(function (repo) {
        var n = repo && repo.stargazers_count;
        if (typeof n !== "number" || n < MIN_STARS_TO_SHOW) return;
        count.textContent = "★ " + n.toLocaleString("es");
        count.hidden = false;
      }).catch(function () {});
    }
  }

  /* ---------- Selector de juego (pestañas accesibles) ---------- */
  function initPicker() {
    var root = $("[data-picker]");
    if (!root) return;
    var tabs = $$("[role=tab]", root);
    var shots = $$(".picker-shot", root);
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
      var key = tab.getAttribute("data-key");
      shots.forEach(function (img) { img.classList.toggle("is-on", img.getAttribute("data-key") === key); });
      root.style.setProperty("--pc", tab.style.getPropertyValue("--gc"));
      if (focus) tab.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t); });
      t.addEventListener("keydown", function (e) {
        var k = e.key, n = tabs.length, j = null;
        if (k === "ArrowRight" || k === "ArrowDown") j = (i + 1) % n;
        else if (k === "ArrowLeft" || k === "ArrowUp") j = (i - 1 + n) % n;
        else if (k === "Home") j = 0;
        else if (k === "End") j = n - 1;
        if (j !== null) { e.preventDefault(); select(tabs[j], true); }
      });
    });
  }

  /* ---------- Pruébalo: rango real desde la API de Kairo ---------- */
  var API = "https://kairo-api-nqts.onrender.com";
  var TIER_NAMES = { IRON: "Hierro", BRONZE: "Bronce", SILVER: "Plata", GOLD: "Oro", PLATINUM: "Platino", EMERALD: "Esmeralda", DIAMOND: "Diamante", MASTER: "Maestro", GRANDMASTER: "Gran Maestro", CHALLENGER: "Retador" };
  var APEX = { MASTER: 1, GRANDMASTER: 1, CHALLENGER: 1 };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function initTry() {
    var form = $("[data-try]");
    var out = $("[data-try-result]");
    if (!form || !out || !window.fetch) return;
    var input = form.elements.riotId, region = form.elements.region, btn = $(".try-btn", form);
    var sample = $("[data-try-sample]");
    var current = null;

    function status(text, isError, spin) {
      out.textContent = "";
      var box = el("div", "tr-status" + (isError ? " is-error" : ""));
      if (spin) box.appendChild(el("span", "tr-spinner"));
      box.appendChild(el("span", null, text));
      out.appendChild(box);
    }

    function get(path, signal) {
      return fetch(API + path, { signal: signal }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (body) {
          if (!r.ok) { var err = new Error(body.error || ("HTTP " + r.status)); err.code = body.code; err.status = r.status; throw err; }
          return body;
        });
      });
    }

    function queueCard(q, label) {
      var box = el("div", "tr-q");
      var info = el("div", "tr-q-info");
      info.appendChild(el("small", null, label));
      if (!q) {
        var img0 = el("img"); img0.src = "landing/img/ranks/iron.webp"; img0.alt = ""; img0.style.opacity = ".25"; img0.style.filter = "grayscale(1)";
        box.appendChild(img0);
        info.appendChild(el("b", "tr-unranked", "Sin clasificar"));
      } else {
        var img = el("img"); img.src = "landing/img/ranks/" + q.tier.toLowerCase() + ".webp"; img.alt = ""; img.width = 64; img.height = 52;
        box.appendChild(img);
        var name = (TIER_NAMES[q.tier] || q.tier) + (APEX[q.tier] ? "" : " " + q.rank);
        info.appendChild(el("b", null, name + " · " + q.leaguePoints + " LP"));
        var games = q.wins + q.losses, wr = games ? Math.round(q.wins / games * 100) : 0;
        var line = el("span");
        line.appendChild(document.createTextNode(q.wins + "V " + q.losses + "D · "));
        line.appendChild(el("span", wr >= 50 ? "wr-up" : null, wr + "% winrate"));
        info.appendChild(line);
      }
      box.appendChild(info);
      return box;
    }

    function render(acc, sum, ranked, regionLabel) {
      out.textContent = "";
      var card = el("article", "tr-card");
      var head = el("div", "tr-head");
      var icon = el("img", "tr-icon");
      icon.alt = ""; icon.width = 64; icon.height = 64;
      icon.src = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/" + (sum.profileIconId || 29) + ".jpg";
      icon.onerror = function () { icon.src = "landing/img/icon-192.webp"; };
      head.appendChild(icon);
      var nm = el("div", "tr-name");
      var b = el("b", null, acc.gameName);
      b.appendChild(el("span", null, " #" + acc.tagLine));
      nm.appendChild(b);
      nm.appendChild(el("small", null, "Nivel " + (sum.summonerLevel || "—") + " · " + regionLabel));
      head.appendChild(nm);
      card.appendChild(head);

      var list = Array.isArray(ranked) ? ranked : [];
      var solo = list.filter(function (q) { return q.queueType === "RANKED_SOLO_5x5"; })[0];
      var flex = list.filter(function (q) { return q.queueType === "RANKED_FLEX_SR"; })[0];
      var qs = el("div", "tr-queues");
      qs.appendChild(queueCard(solo, "Solo/Dúo"));
      qs.appendChild(queueCard(flex, "Flex 5v5"));
      card.appendChild(qs);

      var foot = el("div", "tr-foot");
      foot.appendChild(el("span", null, "Datos en vivo de Riot Games"));
      var a = el("a", null, "Historial y partida en vivo en la app →");
      a.href = "#descargar";
      foot.appendChild(a);
      card.appendChild(foot);
      out.appendChild(card);
    }

    function search(raw, reg) {
      var cut = raw.lastIndexOf("#");
      var name = cut > 0 ? raw.slice(0, cut).trim() : "";
      var tag = cut > 0 ? raw.slice(cut + 1).trim() : "";
      if (!name || !tag) { status("Escribe tu Riot ID completo, con el #TAG. Ejemplo: Nombre#LAN", true); input.focus(); return; }

      if (current) current.abort();
      var ctrl = window.AbortController ? new AbortController() : null;
      current = ctrl;
      var signal = ctrl ? ctrl.signal : undefined;
      var q = "?region=" + encodeURIComponent(reg);
      var regionLabel = region.options[region.selectedIndex].text;

      btn.disabled = true;
      status("Buscando…", false, true);
      // El servidor gratuito se duerme: si tarda, avisar en vez de parecer roto
      var slow = setTimeout(function () { status("Despertando el servidor, puede tardar hasta un minuto…", false, true); }, 4000);
      var hardStop = setTimeout(function () { if (ctrl) ctrl.abort(); }, 75000);

      get("/lol/account/" + encodeURIComponent(name) + "/" + encodeURIComponent(tag) + q, signal)
        .then(function (acc) {
          return Promise.all([
            get("/lol/summoner/" + encodeURIComponent(acc.puuid) + q, signal).catch(function () { return {}; }),
            get("/lol/ranked/" + encodeURIComponent(acc.puuid) + q, signal).catch(function () { return []; })
          ]).then(function (r) { render(acc, r[0], r[1], regionLabel); });
        })
        .catch(function (e) {
          if (e.name === "AbortError" && current !== ctrl) return; // reemplazada por otra búsqueda
          var msg = e.name === "AbortError" ? "El servidor no respondió. Inténtalo de nuevo en un momento."
            : e.status === 404 || e.code === "PLAYER_NOT_FOUND" ? "No encontramos ese Riot ID. Revisa el nombre, el #TAG y la región."
            : e.status === 429 ? "Demasiadas búsquedas seguidas. Espera unos segundos."
            : "No pudimos buscar ahora mismo. Inténtalo de nuevo en un momento.";
          status(msg, true);
        })
        .then(function () { clearTimeout(slow); clearTimeout(hardStop); if (current === ctrl) btn.disabled = false; });
    }

    form.addEventListener("submit", function (e) { e.preventDefault(); search(input.value.trim(), region.value); });
    if (sample) sample.addEventListener("click", function () {
      input.value = "Hide on bush#KR1";
      region.value = "kr";
      search(input.value, "kr");
    });
  }

  /* ---------- Rango que sube (tarjeta de historial de rango) ---------- */
  function initRankup() {
    var box = $("[data-rankup]");
    if (!box) return;
    var tier = $("[data-rankup-tier]", box), lp = $("[data-rankup-lp]", box), bar = $("[data-rankup-bar]", box);
    function finalState() {
      box.classList.add("is-promoted");
      tier.textContent = "EMERALD IV"; lp.textContent = "14";
      bar.style.setProperty("--lp", ".14");
    }
    if (reduced || !("IntersectionObserver" in window)) { finalState(); return; }

    function tween(from, to, ms, done) {
      var t0 = null;
      function step(t) {
        if (!t0) t0 = t;
        var p = Math.min((t - t0) / ms, 1), e = 1 - Math.pow(1 - p, 3);
        var v = Math.round(from + (to - from) * e);
        lp.textContent = v;
        bar.style.setProperty("--lp", (v / 100).toFixed(3));
        if (p < 1) requestAnimationFrame(step); else if (done) done();
      }
      requestAnimationFrame(step);
    }
    function play() {
      box.classList.remove("is-promoted");
      tier.textContent = "PLATINUM I";
      tween(62, 100, 1500, function () {
        setTimeout(function () {
          box.classList.add("is-promoted");
          tier.textContent = "EMERALD IV";
          lp.textContent = "0"; bar.style.setProperty("--lp", "0");
          setTimeout(function () { tween(0, 14, 700); }, 300);
        }, 250);
      });
    }
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      setTimeout(play, 600);
    }, { threshold: 0.6 });
    io.observe(box);
  }

  /* ---------- Visor de capturas (con morph usando View Transitions) ---------- */
  function initLightbox() {
    var dlg = $("[data-lightbox]");
    var track = $("[data-gallery]");
    if (!dlg || !track || typeof dlg.showModal !== "function") return;
    var shots = $$(".shot", track);
    var big = $("[data-lb-img]", dlg), bigPhone = $("[data-lb-phone]", dlg);
    var cap = $("[data-lb-caption]", dlg), count = $("[data-lb-count]", dlg);
    var idx = 0, opener = null; // opener: respaldo si no se encuentra el botón de la captura actual
    var canVT = !!document.startViewTransition && !reduced;

    // Cada captura se vuelve un botón que abre el visor
    shots.forEach(function (fig, i) {
      var phone = $(".phone", fig);
      var img = $("img", fig);
      var label = ($("figcaption", fig) || {}).textContent || "captura";
      var b = el("button", "shot-open");
      b.type = "button";
      b.setAttribute("aria-label", "Ampliar: " + label);
      phone.parentNode.insertBefore(b, phone);
      b.appendChild(phone);
      b.addEventListener("click", function () { opener = b; open(i); });
      fig.__img = img; fig.__phone = phone; fig.__label = label;
    });

    function fill(i) {
      idx = (i + shots.length) % shots.length;
      var f = shots[idx];
      big.src = f.__img.currentSrc || f.__img.src;
      big.alt = f.__img.alt;
      cap.textContent = f.__label;
      count.textContent = (idx + 1) + " de " + shots.length;
    }
    function vt(fn) {
      if (!canVT) { fn(); return { finished: Promise.resolve() }; }
      return document.startViewTransition(fn);
    }
    function open(i) {
      var src = shots[i].__phone;
      src.style.viewTransitionName = "shot";
      var t = vt(function () {
        src.style.viewTransitionName = "";
        fill(i);
        bigPhone.style.viewTransitionName = "shot";
        dlg.showModal();
      });
      t.finished.then(function () { bigPhone.style.viewTransitionName = ""; });
    }
    function close() {
      var target = shots[idx].__phone;
      // Que la captura de destino esté a la vista para que el morph termine en su sitio
      shots[idx].scrollIntoView({ block: "nearest", inline: "center", behavior: "instant" });
      bigPhone.style.viewTransitionName = "shot";
      var t = vt(function () {
        bigPhone.style.viewTransitionName = "";
        dlg.close();
        target.style.viewTransitionName = "shot";
      });
      t.finished.then(function () { target.style.viewTransitionName = ""; var b = target.closest(".shot-open") || opener; if (b) b.focus({ preventScroll: true }); });
    }
    function go(d) {
      if (!canVT) { fill(idx + d); return; }
      document.startViewTransition(function () { fill(idx + d); });
    }

    $("[data-lb-close]", dlg).addEventListener("click", close);
    $("[data-lb-prev]", dlg).addEventListener("click", function () { go(-1); });
    $("[data-lb-next]", dlg).addEventListener("click", function () { go(1); });
    dlg.addEventListener("cancel", function (e) { e.preventDefault(); close(); }); // Esc
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    });
    // Tocar fuera del teléfono cierra
    $("[data-lb-stage]", dlg).addEventListener("click", function (e) {
      if (e.target === e.currentTarget) close();
    });
    // Deslizar para cambiar
    var sx = null, sy = 0;
    dlg.addEventListener("pointerdown", function (e) { sx = e.clientX; sy = e.clientY; });
    dlg.addEventListener("pointerup", function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      sx = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
    });
  }

  /* ---------- Antes / ahora (comparador arrastrable) ---------- */
  function initCompare() {
    var box = $("[data-cmp]");
    if (!box) return;
    var range = $("[data-cmp-range]", box);
    function set(v) {
      v = Math.max(4, Math.min(96, v));
      box.style.setProperty("--pos", v.toFixed(2) + "%");
      if (range && Math.round(range.value) !== Math.round(v)) range.value = Math.round(v);
    }
    function fromEvent(e) {
      var r = box.getBoundingClientRect();
      set((e.clientX - r.left) / r.width * 100);
    }
    var dragging = false;
    box.addEventListener("pointerdown", function (e) {
      dragging = true;
      try { box.setPointerCapture(e.pointerId); } catch (_) {}
      fromEvent(e);
    });
    box.addEventListener("pointermove", function (e) { if (dragging) fromEvent(e); });
    box.addEventListener("pointerup", function () { dragging = false; });
    box.addEventListener("pointercancel", function () { dragging = false; });
    if (range) range.addEventListener("input", function () { set(parseFloat(range.value)); });

    // Pequeña pista la primera vez que aparece: el divisor se mueve solo
    if (reduced || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      var t0 = null;
      function step(t) {
        if (dragging) return;
        if (!t0) t0 = t;
        var p = Math.min((t - t0) / 1600, 1);
        set(50 + Math.sin(p * Math.PI * 2) * 14 * (1 - p));
        if (p < 1) requestAnimationFrame(step);
      }
      setTimeout(function () { requestAnimationFrame(step); }, 400);
    }, { threshold: 0.6 });
    io.observe(box);
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
        setTimeout(function () { requestAnimationFrame(frame); }, 600);
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
    safe(initReady, "initReady");
    safe(initNav, "initNav");
    safe(initReveals, "initReveals");
    safe(initWorld, "initWorld");
    safe(initLive, "initLive");
    safe(initGallery, "initGallery");
    safe(initCoverflow, "initCoverflow");
    safe(initStatement, "initStatement");
    safe(initDock, "initDock");
    safe(initGitHub, "initGitHub");
    safe(initPicker, "initPicker");
    safe(initTry, "initTry");
    safe(initRankup, "initRankup");
    safe(initLightbox, "initLightbox");
    safe(initCompare, "initCompare");
    safe(initCounters, "initCounters");
    safe(initLines, "initLines");
    safe(initYear, "initYear");

    if (window.gsap && window.ScrollTrigger) {
      try { gsap.registerPlugin(ScrollTrigger); } catch (_) {}
      safe(initScrollScenes, "initScrollScenes");
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
