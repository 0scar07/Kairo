const axios = require("axios");
const { TtlCache } = require("./cache");
const { maskRoute } = require("./mask");
const { HttpError } = require("./errors");
const { RiotLimiter, parseLimits, DEFAULT_WINDOWS } = require("./limiter");

// Cola de salida hacia Riot: respeta el cupo de la key (RIOT_RATE_LIMITS="18:1,95:120" = 18/s y 95 cada 120 s)
const limiter = new RiotLimiter({ windows: parseLimits(process.env.RIOT_RATE_LIMITS, DEFAULT_WINDOWS) });

const cache = new TtlCache({ max: 400 });

// TTL (ms) por tipo de dato: las partidas terminadas no cambian nunca
const TTL = {
  account: 10 * 60_000,
  summoner: 5 * 60_000,
  ranked: 2 * 60_000,
  matchIds: 60_000,
  match: 60 * 60_000,
};

let http;
function client() {
  if (!http) {
    http = axios.create({
      timeout: 8000,
      headers: { "X-Riot-Token": process.env.RIOT_API_KEY },
    });
  }
  return http;
}

// Traduce los errores de Riot / de red a HttpError
function toHttpError(e, notFoundMessage) {
  if (e instanceof HttpError) return e;

  const status = e.response?.status;
  // Ruta de Riot que falló, sin PUUID (sirve para saber qué API concreta rechazó la petición)
  const endpoint = e.config?.url ? maskRoute(new URL(e.config.url).pathname) : "(desconocida)";
  if (status === 404) return new HttpError(404, notFoundMessage || "No se encontró lo que buscabas");
  if (status === 400) return new HttpError(400, "Solicitud inválida");
  if (status === 401 || status === 403) {
    console.error(`⚠ Riot respondió ${status} en ${endpoint}: la key es inválida o expiró, o el producto no tiene habilitada esta API (Developer Portal > tu app > APIs)`);
    return new HttpError(503, "Riot rechazó la consulta: la key no es válida o no tiene acceso a esta API todavía", { code: "KEY_INVALID" });
  }
  if (status === 429) {
    const retryAfter = parseInt(e.response.headers?.["retry-after"], 10) || 5;
    return new HttpError(429, `Riot limitó las solicitudes, reintenta en ${retryAfter} s`, { retryAfter });
  }
  if (e.code === "ECONNABORTED" || e.code === "ETIMEDOUT") return new HttpError(504, "Riot tardó demasiado en responder");
  if (status >= 500) return new HttpError(502, "Riot tuvo un problema, intenta de nuevo");
  return new HttpError(502, "No se pudo contactar a Riot");
}

/**
 * GET a Riot con caché, deduplicación y errores normalizados.
 * opts.ttl: milisegundos de caché (0 = sin caché); opts.notFound: mensaje para 404.
 */
async function riotGet(url, { ttl = 0, notFound } = {}) {
  try {
    return await cache.wrap(url, ttl, () => limiter.schedule(() => client().get(url)).then(r => r.data));
  } catch (e) {
    // Si Riot dice 429 se frenan todas las salidas durante el Retry-After
    if (e.response?.status === 429) limiter.pause((parseInt(e.response.headers?.["retry-after"], 10) || 5) * 1000);
    throw toHttpError(e, notFound);
  }
}

// Envuelve un handler async para que sus errores lleguen al manejador central
const handle = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Manejador central de errores: siempre responde JSON { error, code?, retryAfter? }
function errorHandler(err, req, res, _next) {
  const e = err instanceof HttpError ? err : new HttpError(500, "Error interno del servidor");
  if (!(err instanceof HttpError)) console.error("Error no controlado:", err);
  else if (e.status >= 500) console.warn(`${req.method} ${maskRoute(req.originalUrl)} -> ${e.status}: ${e.message}`);
  if (e.retryAfter) res.set("Retry-After", String(e.retryAfter));
  res.status(e.status).json({ error: e.message, code: e.code, retryAfter: e.retryAfter });
}

module.exports = { HttpError, TTL, riotGet, handle, errorHandler, cache, limiter };
