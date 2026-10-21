const text = require("./pushText");
const { isQuiet } = require("./watcher");

/**
 * Avisos de parches nuevos (ajuste `patchAlerts`, juegos elegidos en `patchGames`). Cada 30 minutos mira las noticias
 * (las mismas de la pestaña Noticias, ya en caché) y, cuando aparece unas notas del parche que no había visto, avisa a
 * los dispositivos que siguen ese juego. La primera vez solo guarda lo que hay: nunca avisa de un parche viejo.
 *
 * Lo visto se guarda en el almacén en un solo documento (`patch:seen`) y solo se escribe cuando cambia, para no gastar
 * la base de datos en cada tanda del vigilante.
 */
const MIN = 60_000;
const PATCH_GAMES = ["lol", "tft", "valorant", "wildrift", "dota2", "apex", "pubg"];
const SEEN_KEY = "patch:seen";

// Último parche de cada juego en una lista de noticias (ya viene de lo más nuevo a lo más viejo)
function latestPatches(items) {
  const out = {};
  for (const n of items || []) {
    if (n.kind !== "patch" || !PATCH_GAMES.includes(n.game) || out[n.game]) continue;
    out[n.game] = n;
  }
  return out;
}

class PatchTracker {
  constructor({ store, push, loadNews, now = Date.now, log = console, everyMs = 30 * MIN }) {
    Object.assign(this, { store, push, loadNews, now, log, everyMs });
    this.lastAt = 0;
    this.seen = null;   // { [game]: id } (se carga del almacén la primera vez)
    this.stats = { checks: 0, sent: 0 };
  }

  async tick() {
    const now = this.now();
    if (now - this.lastAt < this.everyMs) return;
    this.lastAt = now;
    this.stats.checks++;

    const latest = latestPatches(await this.loadNews("en"));
    const stored = this.seen ?? (await this.store.getKV(SEEN_KEY));
    const first = !stored;
    const seen = { ...(stored || {}) };
    const fresh = [];
    for (const [game, item] of Object.entries(latest)) {
      if (seen[game] === item.id) continue;
      if (!first && seen[game] !== undefined) fresh.push(game);   // un juego que nunca se había visto tampoco avisa
      seen[game] = item.id;
    }
    if (first || fresh.length || Object.keys(seen).length !== Object.keys(stored || {}).length) await this.store.putKV(SEEN_KEY, seen);
    this.seen = seen;
    for (const game of fresh) await this.notify(game, now);
  }

  async notify(game, now) {
    const devices = (await this.store.list()).filter(d => {
      const s = d.settings || {};
      return d.pushToken && s.enabled && s.patchAlerts !== false && (s.patchGames || ["lol"]).includes(game) && !isQuiet(s, now);
    });
    if (!devices.length) return;

    // El artículo en el idioma de cada dispositivo (cada lista de noticias ya está en caché por idioma)
    const byLocale = new Map();
    const itemFor = async locale => {
      if (!byLocale.has(locale)) byLocale.set(locale, latestPatches(await this.loadNews(locale).catch(() => []))[game] || null);
      return byLocale.get(locale);
    };
    const messages = [], owners = [];
    for (const device of devices) {
      const locale = device.settings.locale || "es";
      const item = (await itemFor(locale)) || (await itemFor("en"));
      if (!item) continue;
      messages.push({
        to: device.pushToken, ...text.patchText(locale, { game, title: item.title }), sound: "default", priority: "normal", channelId: "progress", ttl: 12 * 3600,
        ...(item.image ? { richContent: { image: item.image } } : {}),
        data: { type: "patch", game, path: item.article?.path || null, url: item.url || null },
      });
      owners.push(device);
    }
    if (!messages.length) return;
    const results = await this.push.send(messages);
    for (let i = 0; i < results.length; i++) {
      if (results[i].ok) this.stats.sent++;
      else if (results[i].error === "DeviceNotRegistered") await this.store.remove(owners[i].id);
    }
  }
}

module.exports = { PatchTracker, PATCH_GAMES, latestPatches };
