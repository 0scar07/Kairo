const crypto = require("node:crypto");
const { HttpError } = require("./errors");
const { isRegion } = require("./regions");
const { LOCALES } = require("./pushText");

// Un dispositivo = un celular con la app: su token de notificaciones, sus favoritos vigilados y sus ajustes.
// Sin cuentas: al registrarse recibe un secreto propio (que el servidor guarda con hash) y con él se identifica.

const MAX_FAVORITES = 30;
const PUSH_TOKEN_RE = /^Expo(?:nent)?PushToken\[[A-Za-z0-9_-]{10,80}\]$/;
const PUUID_RE = /^[A-Za-z0-9_-]{20,100}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const PLATFORMS = ["android", "ios"];

const DEFAULT_SETTINGS = Object.freeze({
  enabled: true,        // interruptor general
  notifyStart: true,    // avisar cuando entra en partida
  notifyEnd: true,      // avisar el resultado al terminar
  locale: "es",          // idioma de los textos de las notificaciones
  quiet: { enabled: false, from: "23:00", to: "07:00", utcOffsetMinutes: 0 },   // horario silencioso (hora local del celular)
});

const bad = (message, code) => new HttpError(400, message, { code });
const isBool = v => typeof v === "boolean";

function parsePushToken(value) {
  if (typeof value !== "string" || !PUSH_TOKEN_RE.test(value)) throw bad("Token de notificaciones no válido", "INVALID_PUSH_TOKEN");
  return value;
}

function parsePlatform(value) {
  if (value === undefined) return "android";
  if (!PLATFORMS.includes(value)) throw bad("Plataforma no válida", "INVALID_PLATFORM");
  return value;
}

// Lista completa de favoritos vigilados (reemplaza a la anterior). Ignora campos desconocidos y duplicados.
function parseFavorites(list) {
  if (!Array.isArray(list)) throw bad("Los favoritos deben ser una lista", "INVALID_FAVORITES");
  if (list.length > MAX_FAVORITES) throw bad(`Máximo ${MAX_FAVORITES} favoritos con alertas`, "TOO_MANY_FAVORITES");
  const seen = new Set();
  const out = [];
  for (const f of list) {
    if (!f || typeof f !== "object" || typeof f.puuid !== "string" || !PUUID_RE.test(f.puuid)) throw bad("Favorito no válido: puuid incorrecto", "INVALID_FAVORITES");
    if (!isRegion(f.region)) throw bad("Favorito no válido: región desconocida", "INVALID_FAVORITES");
    const riotId = typeof f.riotId === "string" ? f.riotId.trim().slice(0, 40) : "";
    if (f.muted !== undefined && !isBool(f.muted)) throw bad("Favorito no válido: muted debe ser verdadero o falso", "INVALID_FAVORITES");
    if (seen.has(f.puuid)) continue;
    seen.add(f.puuid);
    out.push({ puuid: f.puuid, region: f.region, riotId, muted: f.muted === true });
  }
  return out;
}

// Ajustes parciales: solo cambia lo que llega; lo demás se conserva
function parseSettings(input, current = DEFAULT_SETTINGS) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw bad("Ajustes no válidos", "INVALID_SETTINGS");
  const next = { ...current, quiet: { ...current.quiet } };
  for (const key of ["enabled", "notifyStart", "notifyEnd"]) {
    if (input[key] === undefined) continue;
    if (!isBool(input[key])) throw bad(`Ajuste no válido: ${key}`, "INVALID_SETTINGS");
    next[key] = input[key];
  }
  if (input.locale !== undefined) {
    if (!LOCALES.includes(input.locale)) throw bad("Idioma no válido", "INVALID_SETTINGS");
    next.locale = input.locale;
  }
  if (input.quiet !== undefined) {
    const q = input.quiet;
    if (!q || typeof q !== "object") throw bad("Horario silencioso no válido", "INVALID_SETTINGS");
    if (q.enabled !== undefined) { if (!isBool(q.enabled)) throw bad("Horario silencioso no válido", "INVALID_SETTINGS"); next.quiet.enabled = q.enabled; }
    for (const key of ["from", "to"]) {
      if (q[key] === undefined) continue;
      if (typeof q[key] !== "string" || !TIME_RE.test(q[key])) throw bad("Hora no válida (usa HH:MM)", "INVALID_SETTINGS");
      next.quiet[key] = q[key];
    }
    if (q.utcOffsetMinutes !== undefined) {
      if (!Number.isInteger(q.utcOffsetMinutes) || Math.abs(q.utcOffsetMinutes) > 14 * 60) throw bad("Zona horaria no válida", "INVALID_SETTINGS");
      next.quiet.utcOffsetMinutes = q.utcOffsetMinutes;
    }
  }
  return next;
}

const newSecret = () => crypto.randomBytes(32).toString("base64url");
const hashSecret = secret => crypto.createHash("sha256").update(secret).digest("hex");
const secretMatches = (secret, hash) => {
  const a = Buffer.from(hashSecret(secret), "hex");
  const b = Buffer.from(String(hash), "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// Lo que se le devuelve a la app: nunca el hash del secreto ni el token de notificaciones
const publicDevice = d => ({ id: d.id, platform: d.platform, favorites: d.favorites, settings: d.settings, createdAt: d.createdAt, updatedAt: d.updatedAt });

module.exports = {
  MAX_FAVORITES, DEFAULT_SETTINGS,
  parsePushToken, parsePlatform, parseFavorites, parseSettings,
  newSecret, hashSecret, secretMatches, publicDevice,
};
