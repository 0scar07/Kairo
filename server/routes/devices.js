const crypto = require("node:crypto");
const { Router } = require("express");
const rateLimit = require("express-rate-limit");
const { handle } = require("../lib/riot");
const { HttpError } = require("../lib/errors");
const {
  DEFAULT_SETTINGS, parsePushToken, parsePlatform, parseFavorites, parseSettings,
  newSecret, hashSecret, secretMatches, publicDevice,
} = require("../lib/devices");

/**
 * Registro de dispositivos para las notificaciones (sin cuentas).
 *
 *   POST   /devices                 { pushToken, platform?, favorites?, settings? } -> { deviceId, secret, device }
 *   GET    /devices/me              -> device
 *   PUT    /devices/me/favorites    { favorites: [{ puuid, region, riotId, muted? }] }   (reemplaza la lista)
 *   PUT    /devices/me/settings     { enabled?, notifyStart?, notifyEnd?, quiet? }        (cambia solo lo enviado)
 *   PUT    /devices/me/token        { pushToken }                                          (Expo puede rotar el token)
 *   DELETE /devices/me              -> 204 (baja)
 *
 * El registro devuelve un secreto UNA sola vez. Las demás llamadas lo envían así:
 *   Authorization: Device <deviceId>.<secret>
 * Registrar un token ya existente entrega un secreto nuevo (el token solo lo conocen el celular y este servidor).
 */
function createDevicesRouter(store, { maxDevices = 5000, registerPerHour = 20 } = {}) {
  const router = Router();

  const registerLimiter = rateLimit({
    windowMs: 60 * 60_000,
    limit: registerPerHour,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler(req, _res, next) {
      const retryAfter = Math.max(1, Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000));
      next(new HttpError(429, "Demasiados registros desde esta red, reintenta más tarde", { retryAfter, code: "RATE_LIMITED_IP" }));
    },
  });

  const authError = () => new HttpError(401, "Dispositivo no reconocido: vuelve a activar las notificaciones", { code: "DEVICE_AUTH" });

  // Identifica al dispositivo por el encabezado Authorization: Device <id>.<secreto>
  const auth = handle(async (req, _res, next) => {
    const m = /^Device ([0-9a-f-]{36})\.([A-Za-z0-9_-]{20,100})$/.exec(req.get("authorization") || "");
    if (!m) throw authError();
    const device = await store.get(m[1]);
    // Se compara siempre (aunque no exista) para no delatar por tiempo qué IDs son válidos
    const ok = secretMatches(m[2], device?.secretHash ?? crypto.randomBytes(32).toString("hex"));
    if (!device || !ok) throw authError();
    req.device = device;
    next();
  });

  const save = async (device, changes = {}) => {
    const next = { ...device, ...changes, updatedAt: new Date().toISOString() };
    await store.put(next);
    return next;
  };

  router.post("/", registerLimiter, handle(async (req, res) => {
    const body = req.body || {};
    const pushToken = parsePushToken(body.pushToken);
    const platform = parsePlatform(body.platform);
    const favorites = body.favorites !== undefined ? parseFavorites(body.favorites) : undefined;
    const settings = body.settings !== undefined ? parseSettings(body.settings) : undefined;

    const existing = await store.getByToken(pushToken);
    if (!existing && (await store.count()) >= maxDevices) {
      throw new HttpError(503, "El servicio de notificaciones está lleno por ahora", { code: "DEVICE_LIMIT" });
    }
    const now = new Date().toISOString();
    const secret = newSecret();
    const device = await save(existing || { id: crypto.randomUUID(), pushToken, createdAt: now, favorites: [], settings: structuredClone(DEFAULT_SETTINGS) }, {
      secretHash: hashSecret(secret),
      platform,
      ...(favorites ? { favorites } : {}),
      ...(settings ? { settings } : {}),
    });
    res.status(existing ? 200 : 201).json({ deviceId: device.id, secret, device: publicDevice(device) });
  }));

  router.get("/me", auth, (req, res) => res.json(publicDevice(req.device)));

  router.put("/me/favorites", auth, handle(async (req, res) => {
    const favorites = parseFavorites(req.body?.favorites);
    res.json(publicDevice(await save(req.device, { favorites })));
  }));

  router.put("/me/settings", auth, handle(async (req, res) => {
    const settings = parseSettings(req.body, req.device.settings);
    res.json(publicDevice(await save(req.device, { settings })));
  }));

  router.put("/me/token", auth, handle(async (req, res) => {
    const pushToken = parsePushToken(req.body?.pushToken);
    res.json(publicDevice(await save(req.device, { pushToken })));
  }));

  router.delete("/me", auth, handle(async (req, res) => {
    await store.remove(req.device.id);
    res.status(204).end();
  }));

  return router;
}

module.exports = { createDevicesRouter };
