const crypto = require("node:crypto");
const { Router } = require("express");
const rateLimit = require("express-rate-limit");
const { handle } = require("../lib/riot");
const { HttpError } = require("../lib/errors");

/**
 * Favoritos sincronizados entre dispositivos de Kairo Web, sin cuentas: un código de 12 caracteres hace de llave.
 * Quien tiene el código puede leer y escribir (como un enlace privado). Se guarda en el almacén (kv "sync:<código>").
 *   POST /sync          { data } -> { code, updatedAt }          crea un código nuevo
 *   GET  /sync/:code    -> { data, updatedAt }
 *   PUT  /sync/:code    { data } -> { updatedAt }                reemplaza lo guardado
 * data = { favorites: [...], removed: [...] } (lo arma la web; aquí solo se limita el tamaño y la forma)
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";   // sin 0/O, 1/I/L
const CODE_RE = new RegExp(`^[${ALPHABET}]{12}$`);
const MAX_BYTES = 32 * 1024;
const MAX_ITEMS = 200;

const newCode = () => Array.from(crypto.randomBytes(12), b => ALPHABET[b % ALPHABET.length]).join("");
const codeOf = raw => {
  const code = String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!CODE_RE.test(code)) throw new HttpError(400, "Código de sincronización no válido", { code: "INVALID_SYNC_CODE" });
  return code;
};

/** Solo listas de objetos planos y con límites: nada de lo que llegue se interpreta en el servidor */
function parseData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new HttpError(400, "Datos no válidos", { code: "INVALID_SYNC_DATA" });
  const out = {};
  for (const key of ["favorites", "removed"]) {
    const list = data[key] ?? [];
    if (!Array.isArray(list) || list.length > MAX_ITEMS || list.some(x => !x || typeof x !== "object" || Array.isArray(x))) {
      throw new HttpError(400, `Datos no válidos: ${key}`, { code: "INVALID_SYNC_DATA" });
    }
    out[key] = list;
  }
  if (Buffer.byteLength(JSON.stringify(out)) > MAX_BYTES) throw new HttpError(413, "Demasiados datos para sincronizar", { code: "SYNC_TOO_LARGE" });
  return out;
}

function createSyncRouter(store, { perHour = 120 } = {}) {
  const router = Router();
  router.use(rateLimit({
    windowMs: 60 * 60_000, limit: perHour, standardHeaders: "draft-7", legacyHeaders: false,
    handler(req, _res, next) {
      const retryAfter = Math.max(1, Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000));
      next(new HttpError(429, "Demasiadas sincronizaciones desde esta red, reintenta más tarde", { retryAfter, code: "RATE_LIMITED_IP" }));
    },
  }));

  router.post("/", handle(async (req, res) => {
    const data = parseData(req.body?.data);
    let code = newCode();
    while (await store.getKV(`sync:${code}`)) code = newCode();
    const updatedAt = new Date().toISOString();
    await store.putKV(`sync:${code}`, { data, updatedAt });
    res.status(201).json({ code, updatedAt });
  }));

  router.get("/:code", handle(async (req, res) => {
    const doc = await store.getKV(`sync:${codeOf(req.params.code)}`);
    if (!doc) throw new HttpError(404, "Ese código no existe", { code: "SYNC_NOT_FOUND" });
    res.json(doc);
  }));

  router.put("/:code", handle(async (req, res) => {
    const code = codeOf(req.params.code);
    if (!(await store.getKV(`sync:${code}`))) throw new HttpError(404, "Ese código no existe", { code: "SYNC_NOT_FOUND" });
    const updatedAt = new Date().toISOString();
    await store.putKV(`sync:${code}`, { data: parseData(req.body?.data), updatedAt });
    res.json({ updatedAt });
  }));

  return router;
}

module.exports = { createSyncRouter, newCode, codeOf, parseData };
