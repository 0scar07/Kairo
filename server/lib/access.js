const { riotGet, TTL } = require("./riot");
const { platformHost, accountHost, DEFAULT_REGION } = require("./regions");
const PATHS = require("./paths");
const supercell = require("./supercell");
const extra = require("./extra");

/**
 * ¿Qué juegos puede consultar la key de este servidor? Cada API se habilita por producto en el
 * Developer Portal: una key puede tener LoL y no TFT (Riot responde 403). Un sondeo periódico consulta
 * una cuenta pública conocida y guarda el resultado, para que la app deje de ofrecer lo que no funciona.
 *
 * Solo se marca un juego como no disponible si la cuenta se pudo resolver (la key es válida) y aun así
 * la API del juego respondió 403. Si el sondeo falla por otra causa se conserva el último estado.
 */
const state = Object.fromEntries(Object.keys(PATHS).map(id => [id, true]));   // optimista hasta el primer sondeo
let lastProbe = null;

// "Nombre#TAG@region" de una cuenta pública para el sondeo
function probeTarget() {
  const raw = process.env.PROBE_RIOT_ID || "Hide on bush#KR1@kr";
  const [id, region] = raw.split("@");
  const cut = id.lastIndexOf("#");
  return { gameName: id.slice(0, cut), tagLine: id.slice(cut + 1), region: (region || "kr").toLowerCase() };
}

async function probe() {
  const { gameName, tagLine, region } = probeTarget();
  let account;
  try {
    const url = `${accountHost(region)}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    account = await riotGet(url, { ttl: TTL.account });
  } catch (e) {
    console.warn("Sondeo de acceso: no se pudo resolver la cuenta de prueba, se conservan los estados:", e.message);
    return;
  }
  for (const [id, paths] of Object.entries(PATHS)) {
    try {
      await riotGet(`${platformHost(region)}${paths.summoner(account.puuid)}`, { ttl: 0 });
      state[id] = true;
    } catch (e) {
      if (e.code === "KEY_INVALID") {
        if (state[id]) console.warn(`Sondeo de acceso: la key no tiene acceso a "${id}" (403). La app lo mostrará como "próximamente".`);
        state[id] = false;
      } else {
        console.warn(`Sondeo de acceso: "${id}" no concluyente (${e.message}), se conserva el estado`);
      }
    }
  }
  lastProbe = Date.now();
}

// Si una petición real de un juego funciona, está disponible (recupera antes que el próximo sondeo)
const markWorking = id => { if (id in state) state[id] = true; };

function start(intervalMs = 10 * 60_000) {
  probe().catch(e => console.warn("Sondeo de acceso:", e.message));
  const timer = setInterval(() => probe().catch(e => console.warn("Sondeo de acceso:", e.message)), intervalMs);
  timer.unref?.();
}

// Los juegos de Supercell y los demás (Dota 2, Fortnite, Apex, PUBG) no se sondean: están disponibles si el servidor tiene su key configurada
const games = () => ({
  ...state,
  ...Object.fromEntries(Object.keys(supercell.GAMES).map(id => [id, supercell.configured(id)])),
  // Dota 2 (OpenDota) no necesita key; Fortnite, Apex y PUBG, sí
  ...Object.fromEntries(Object.entries(extra.UPSTREAMS).map(([id, up]) => [id, up.configured()])),
});

module.exports = { start, probe, games, markWorking, lastProbeAt: () => lastProbe };
