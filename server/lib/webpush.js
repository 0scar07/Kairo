const crypto = require("node:crypto");
const webpush = require("web-push");
const { HttpError } = require("./errors");

/**
 * Avisos en el navegador (Web Push, para Kairo Web). Necesita un par de claves VAPID en el entorno:
 *   WEBPUSH_PUBLIC_KEY, WEBPUSH_PRIVATE_KEY (se generan con `npx web-push generate-vapid-keys`)
 *   WEBPUSH_SUBJECT  (opcional) mailto: o https: de contacto
 * El aviso lleva una ruta relativa (lol/lan/Nombre-TAG/en-vivo) y el service worker de la web la completa.
 * Un navegador se registra como un dispositivo más (platform "web"); su `pushToken` es "WebPush[<hash>]" y la
 * suscripción va en `webPush`. lib/pushRouter.js decide si cada aviso va a Expo o aquí.
 */
const configured = () => Boolean(process.env.WEBPUSH_PUBLIC_KEY && process.env.WEBPUSH_PRIVATE_KEY);
const publicKey = () => (configured() ? process.env.WEBPUSH_PUBLIC_KEY : null);
const isWebToken = token => typeof token === "string" && token.startsWith("WebPush[");

const bad = message => new HttpError(400, message, { code: "INVALID_WEB_PUSH" });
const B64URL = /^[A-Za-z0-9_-]+=*$/;

/** Valida la suscripción del navegador (PushSubscription.toJSON()) y deja solo lo necesario */
function parseSubscription(sub) {
  if (!sub || typeof sub !== "object") throw bad("Suscripción no válida");
  let url;
  try { url = new URL(sub.endpoint); } catch { throw bad("Suscripción no válida: endpoint"); }
  if (url.protocol !== "https:" || sub.endpoint.length > 1000) throw bad("Suscripción no válida: endpoint");
  const { p256dh, auth } = sub.keys || {};
  if (typeof p256dh !== "string" || typeof auth !== "string" || !B64URL.test(p256dh) || !B64URL.test(auth) || p256dh.length > 200 || auth.length > 100) {
    throw bad("Suscripción no válida: claves");
  }
  return { endpoint: sub.endpoint, keys: { p256dh, auth } };
}

/** Token estable por suscripción (así un navegador que se vuelve a registrar no se duplica) */
const tokenFor = subscription => `WebPush[${crypto.createHash("sha256").update(subscription.endpoint).digest("base64url").slice(0, 43)}]`;

// Región del backend -> la de la URL de la web
const REGION_SLUG = { la1: "lan", la2: "las", na1: "na", euw1: "euw", kr: "kr", br1: "br" };

/** A qué página de la web lleva el aviso (relativa a la web), según los datos del mensaje */
function pathFor(data = {}) {
  const [name, tag] = String(data.riotId || "").split("#");
  const slug = REGION_SLUG[data.region];
  if (slug && name && tag) {
    const base = `lol/${slug}/${encodeURIComponent(name)}-${encodeURIComponent(tag)}`;
    return String(data.type || "").startsWith("live_start") ? `${base}/en-vivo` : base;
  }
  return "favoritos";
}

/**
 * Envía un aviso. message = el mismo objeto que se arma para Expo ({ title, body, data, ttl }).
 * Devuelve { ok } o { ok: false, error } ("DeviceNotRegistered" si la suscripción ya no existe: se da de baja).
 */
async function send(subscription, message) {
  if (!configured()) return { ok: false, error: "WEBPUSH_NOT_CONFIGURED" };
  const payload = JSON.stringify({
    title: message.title || "Kairo",
    body: message.body || "",
    url: pathFor(message.data),
    tag: message.data?.gameId ? `game-${message.data.gameId}` : message.data?.type || "kairo",
  });
  try {
    await webpush.sendNotification(subscription, payload, {
      TTL: message.ttl || 3600,
      urgency: message.priority === "high" ? "high" : "normal",
      vapidDetails: {
        subject: process.env.WEBPUSH_SUBJECT || "mailto:kairo@example.com",
        publicKey: process.env.WEBPUSH_PUBLIC_KEY,
        privateKey: process.env.WEBPUSH_PRIVATE_KEY,
      },
    });
    return { ok: true };
  } catch (e) {
    // 404 y 410: el navegador anuló la suscripción (se quitó el permiso o se borraron los datos)
    if (e.statusCode === 404 || e.statusCode === 410) return { ok: false, error: "DeviceNotRegistered" };
    console.warn(`Web Push falló (${e.statusCode || e.message})`);
    return { ok: false, error: "SEND_FAILED" };
  }
}

module.exports = { configured, publicKey, isWebToken, parseSubscription, tokenFor, pathFor, send };
