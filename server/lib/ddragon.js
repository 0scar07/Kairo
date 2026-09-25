const axios = require("axios");

// Nombres de campeones desde Data Dragon (id numérico -> nombre) en el idioma del usuario, con caché de 6 horas.
// Es solo un adorno del texto de la notificación: si falla, el aviso sale sin el nombre del campeón.
const BASE = () => process.env.DDRAGON_BASE || "https://ddragon.leagueoflegends.com";
const LANG = { es: "es_MX", en: "en_US", pt: "pt_BR", fr: "fr_FR", de: "de_DE" };
const TTL = 6 * 60 * 60_000;

const cache = new Map();   // locale -> { at, names }
const inflight = new Map();

async function load(locale) {
  const { data: versions } = await axios.get(`${BASE()}/api/versions.json`, { timeout: 6000 });
  const { data } = await axios.get(`${BASE()}/cdn/${versions[0]}/data/${LANG[locale] || LANG.es}/champion.json`, { timeout: 8000 });
  const names = {}, ids = {};
  for (const c of Object.values(data.data || {})) { names[Number(c.key)] = c.name; ids[Number(c.key)] = c.id; }
  return { names, ids };
}

async function championName(championId, locale = "es", now = Date.now()) {
  if (!Number.isFinite(championId)) return null;
  let entry = cache.get(locale);
  if (!entry || now - entry.at > TTL) {
    try {
      if (!inflight.has(locale)) inflight.set(locale, load(locale).finally(() => inflight.delete(locale)));
      entry = { at: now, ...(await inflight.get(locale)) };
      cache.set(locale, entry);
    } catch (e) {
      if (!entry) return null;   // sin datos previos: sin nombre
    }
  }
  return entry.names[championId] || null;
}

// Nombre e id de imagen (el de las URLs de Data Dragon, p. ej. "MonkeyKing") de un campeón
async function championInfo(championId, locale = "es", now = Date.now()) {
  const name = await championName(championId, locale, now);
  const entry = cache.get(locale);
  return name ? { name, imageId: entry?.ids?.[championId] || null } : null;
}

const reset = () => cache.clear();

module.exports = { championName, championInfo, reset };
