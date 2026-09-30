(function () {
  "use strict";
  // Datos de marca. El contenido importante ya está escrito en index.html;
  // esto solo lo usa main.js para detalles (reloj en vivo, enlaces).
  window.__BRAND__ = {
    name: "Kairo",
    tagline: "Cada partida cuenta.",
    links: {
      apk: "https://github.com/0scar07/Kairo/releases/latest/download/Kairo.apk",
      obtainium: "https://apps.obtainium.imranr.dev/redirect.html?r=obtainium%3A%2F%2Fadd%2Fhttps%3A%2F%2Fgithub.com%2F0scar07%2FKairo",
      web: "https://0scar07.github.io/Kairo/app/",
      repo: "https://github.com/0scar07/Kairo"
    },
    // Minuto y segundo con los que arranca el reloj de la sección "Partida en vivo"
    liveClockStart: 21 * 60 + 26
  };
})();
