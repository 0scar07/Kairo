const axios = require("axios");
const { TtlCache } = require("./cache");
const { HttpError } = require("./errors");

/**
 * Cliente genérico para las APIs de terceros de los demás juegos (OpenDota, Fortnite-API, Apex Legends Status, PUBG).
 * Cada una declara su URL base, cómo se envía la key y, si hace falta, cómo traducir sus errores particulares.
 * Las respuestas se cachean (la key nunca forma parte de la clave de caché ni de los logs) y los errores se
 * normalizan a HttpError con un `code` estable que la app traduce.
 */
const cache = new TtlCache({ max: 400 });

// Traduce los errores de red / HTTP de una API de terceros a HttpError
function toHttpError(e, name, notFound) {
  if (e instanceof HttpError) return e;
  const status = e.response?.status;
  const provider = name;

  if (status === 404) return new HttpError(404, notFound?.message || "Jugador no encontrado", { code: notFound?.code || "PLAYER_NOT_FOUND" });
  if (status === 400 || status === 422) return new HttpError(400, "Solicitud inválida", { code: "BAD_REQUEST" });
  if (status === 401 || status === 403) {
    console.error(`⚠ ${name} respondió ${status}: revisa la key`);
    return new HttpError(503, `${name} rechazó la consulta: la key no es válida o no tiene acceso`, { code: "KEY_INVALID", provider });
  }
  if (status === 429) {
    const retryAfter = parseInt(e.response.headers?.["retry-after"], 10) || 5;
    return new HttpError(429, `${name} limitó las solicitudes, reintenta en ${retryAfter} s`, { code: "RATE_LIMITED", retryAfter, provider });
  }
  if (status === 503) return new HttpError(503, `${name} está en mantenimiento, vuelve a intentarlo más tarde`, { code: "MAINTENANCE", provider });
  if (e.code === "ECONNABORTED" || e.code === "ETIMEDOUT") return new HttpError(504, `${name} tardó demasiado en responder`, { code: "TIMEOUT", provider });
  if (status >= 500) return new HttpError(502, `${name} tuvo un problema, intenta de nuevo`, { code: "UPSTREAM_ERROR", provider });
  return new HttpError(502, `No se pudo contactar a ${name}`, { code: "UPSTREAM_UNREACHABLE", provider });
}

/**
 * opts:
 *  id, name       identificador y nombre visible (para los mensajes)
 *  base, baseEnv  URL base y variable de entorno que la sustituye
 *  keyEnv         variable con la key; sin ella la API no necesita key (o es opcional, ver `optional`)
 *  optional       la key mejora los límites pero no es obligatoria (ej. OpenDota)
 *  headers(key)   cabeceras de cada petición (autenticación, Accept…)
 *  query(key)     parámetros que se añaden siempre (ej. api_key)
 *  timeout        milisegundos de espera por petición (8000 por defecto)
 */
function createUpstream(opts) {
  const { id, name, base, baseEnv, keyEnv, optional = false, headers, query, timeout = 8000 } = opts;
  const keyOf = () => (keyEnv ? process.env[keyEnv] : undefined);
  const configured = () => optional || !keyEnv || Boolean(keyOf());
  const baseUrl = () => String((baseEnv && process.env[baseEnv]) || base).replace(/\/+$/, "");

  /** GET `path` con caché. opts: ttl (ms), query, notFound {message, code}, mapError(e) -> HttpError | null */
  async function get(path, { ttl = 0, query: extra, notFound, mapError } = {}) {
    if (!configured()) {
      throw new HttpError(503, `${name} no está configurado en el servidor`, { code: "NOT_CONFIGURED", provider: name });
    }
    const key = keyOf();
    const params = { ...(extra || {}), ...(query ? query(key) : {}) };
    const url = baseUrl() + path;
    // La clave de caché no incluye los parámetros de autenticación
    const publicParams = Object.entries(extra || {}).map(([k, v]) => `${k}=${v}`).join("&");
    const cacheKey = `${id}:${url}?${publicParams}`;
    try {
      return await cache.wrap(cacheKey, ttl, () =>
        axios.get(url, { timeout, params, headers: headers ? headers(key) : {} }).then(r => r.data));
    } catch (e) {
      throw (mapError && mapError(e)) || toHttpError(e, name, notFound);
    }
  }

  return { id, name, configured, get };
}

module.exports = { createUpstream, toHttpError, cache };
