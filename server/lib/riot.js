const axios = require("axios");
const { TtlCache } = require("./cache");

// Error con estado HTTP y mensaje en español listo para mostrar en la app
class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    Object.assign(this, extra);
  }
}

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
  if (status === 404) return new HttpError(404, notFoundMessage || "No se encontró lo que buscabas");
  if (status === 400) return new HttpError(400, "Solicitud inválida");
  if (status === 401 || status === 403) {
    console.error("⚠ Riot rechazó la key (401/403): revisa RIOT_API_KEY en server/.env; las keys de desarrollo caducan cada 24 h");
    return new HttpError(503, "El servidor no tiene acceso a Riot (la key es inválida o expiró)", { code: "KEY_INVALID" });
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
    return await cache.wrap(url, ttl, () => client().get(url).then(r => r.data));
  } catch (e) {
    throw toHttpError(e, notFound);
  }
}

// Envuelve un handler async para que sus errores lleguen al manejador central
const handle = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Manejador central de errores: siempre responde JSON { error, code?, retryAfter? }
function errorHandler(err, req, res, _next) {
  const e = err instanceof HttpError ? err : new HttpError(500, "Error interno del servidor");
  if (!(err instanceof HttpError)) console.error("Error no controlado:", err);
  else if (e.status >= 500) console.warn(`${req.method} ${req.originalUrl} -> ${e.status}: ${e.message}`);
  if (e.retryAfter) res.set("Retry-After", String(e.retryAfter));
  res.status(e.status).json({ error: e.message, code: e.code, retryAfter: e.retryAfter });
}

module.exports = { HttpError, TTL, riotGet, handle, errorHandler, cache };
