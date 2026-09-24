const axios = require("axios");
const { TtlCache } = require("./cache");
const { HttpError } = require("./errors");

/**
 * APIs oficiales de Supercell (Brawl Stars, Clash Royale, Clash of Clans). Las tres funcionan igual:
 * `Authorization: Bearer <key>` y jugadores identificados por su tag (#2PP0).
 *
 * La key de Supercell se ata a las IP que le permitas, y los hostings gratuitos no tienen IP fija.
 * Por eso por defecto se usan los proxies comunitarios de RoyaleAPI (su IP es 45.79.218.79: es la que hay
 * que permitir al crear la key). Con un servidor de IP fija puedes apuntar a la API oficial con *_API_BASE.
 */
const GAMES = {
  brawlstars: {
    name: "Brawl Stars",
    keyEnv: "BRAWLSTARS_API_KEY",
    baseEnv: "BRAWLSTARS_API_BASE",
    base: "https://bsproxy.royaleapi.dev/v1",
    battlelog: true,
    top: "/rankings/global/players",
  },
  clashroyale: {
    name: "Clash Royale",
    keyEnv: "CLASHROYALE_API_KEY",
    baseEnv: "CLASHROYALE_API_BASE",
    base: "https://proxy.royaleapi.dev/v1",
    battlelog: true,
    top: "/locations/global/pathoflegend/players",
  },
  clashofclans: {
    name: "Clash of Clans",
    keyEnv: "CLASHOFCLANS_API_KEY",
    baseEnv: "CLASHOFCLANS_API_BASE",
    base: "https://cocproxy.royaleapi.dev/v1",
    battlelog: false,
    top: "/locations/global/rankings/players",
  },
};

// TTL (ms) por tipo de dato
const TTL = { player: 60_000, battles: 30_000, top: 10 * 60_000 };

const cache = new TtlCache({ max: 300 });

// Los tags usan solo estos caracteres; Supercell trata la letra O como el cero
const TAG_RE = /^[0289PYLQGRJCUV]{3,15}$/;

/** "#2pp0", "2PP0" u "2ppo" -> "2PP0". Lanza 400 si no es un tag válido. */
function normalizeTag(raw) {
  const tag = String(raw || "").trim().replace(/^#/, "").toUpperCase().replace(/O/g, "0");
  if (!TAG_RE.test(tag)) throw new HttpError(400, "Tag no válido: usa letras y números como #2PP0");
  return tag;
}

const configured = id => Boolean(process.env[GAMES[id].keyEnv]);
const baseOf = id => (process.env[GAMES[id].baseEnv] || GAMES[id].base).replace(/\/+$/, "");

// Traduce los errores de Supercell / de red a HttpError
function toHttpError(id, e) {
  if (e instanceof HttpError) return e;
  const { name } = GAMES[id];
  const status = e.response?.status;
  const reason = e.response?.data?.reason;

  if (status === 404) return new HttpError(404, "Jugador no encontrado: revisa el tag");
  if (status === 400) return new HttpError(400, "Tag no válido");
  if (status === 401 || status === 403) {
    // 403 "accessDenied.invalidIp": la key no permite la IP desde la que sale la petición
    console.error(`⚠ ${name} respondió ${status}${reason ? ` (${reason})` : ""}: revisa la key y sus IP permitidas`);
    return new HttpError(503, `${name} rechazó la consulta: la key no es válida o no permite la IP del servidor`, { code: "KEY_INVALID" });
  }
  if (status === 429) return new HttpError(429, `${name} limitó las solicitudes, reintenta en unos segundos`, { retryAfter: 5 });
  if (status === 503) return new HttpError(503, `${name} está en mantenimiento, vuelve a intentarlo más tarde`, { code: "MAINTENANCE" });
  if (e.code === "ECONNABORTED" || e.code === "ETIMEDOUT") return new HttpError(504, `${name} tardó demasiado en responder`);
  if (status >= 500) return new HttpError(502, `${name} tuvo un problema, intenta de nuevo`);
  return new HttpError(502, `No se pudo contactar a ${name}`);
}

/** GET a una ruta de la API del juego con caché y errores normalizados. */
async function apiGet(id, path, ttl) {
  if (!configured(id)) {
    throw new HttpError(503, `${GAMES[id].name} no está configurado en el servidor`, { code: "NOT_CONFIGURED" });
  }
  const url = `${baseOf(id)}${path}`;
  try {
    return await cache.wrap(url, ttl, () =>
      axios.get(url, { timeout: 8000, headers: { Authorization: `Bearer ${process.env[GAMES[id].keyEnv]}` } }).then(r => r.data));
  } catch (e) {
    throw toHttpError(id, e);
  }
}

/** `/players/%23TAG[/suffix]` */
const playerGet = (id, tag, suffix, ttl) => apiGet(id, `/players/%23${tag}${suffix}`, ttl);

module.exports = { GAMES, TTL, TAG_RE, normalizeTag, configured, apiGet, playerGet, toHttpError, cache };
