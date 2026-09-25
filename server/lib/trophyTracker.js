const supercell = require("./supercell");
const text = require("./pushText");
const { isQuiet } = require("./watcher");

/**
 * Récords de trofeos de Brawl Stars y Clash Royale. Cada 6 horas mira a los favoritos con la campanita de los
 * dispositivos registrados (un jugador seguido por varios se consulta una vez) y avisa cuando su MEJOR marca de
 * trofeos sube. La primera vez solo guarda la marca de partida: no avisa de lo que ya tenía.
 */
const HOUR = 3_600_000;

const defaultApi = { player: (game, tag) => supercell.playerGet(game, tag, "", 0) };

// Mejor marca de trofeos que reporta cada juego
const recordOf = p => Math.max(Number(p.highestTrophies) || 0, Number(p.bestTrophies) || 0, Number(p.trophies) || 0);

class TrophyTracker {
  constructor({ store, push, api = defaultApi, now = Date.now, log = console, everyMs = 6 * HOUR, maxPerTick = 6, configured = supercell.configured }) {
    Object.assign(this, { store, push, api, now, log, everyMs, maxPerTick, configured });
    this.last = new Map();   // clave -> instante de la última consulta (en memoria; al reiniciar se vuelve a consultar una vez)
  }

  // "brawlstars:8QL9UPCLP" -> { game, tag, subs: [{ device, fav }] }
  targets(devices) {
    const map = new Map();
    for (const device of devices) {
      const s = device.settings || {};
      if (!s.enabled || !s.trophyAlerts) continue;
      for (const fav of device.favorites || []) {
        if (!fav.game || fav.game === "lol" || fav.muted) continue;
        const key = `${fav.game}:${fav.puuid}`;
        if (!map.has(key)) map.set(key, { game: fav.game, tag: fav.puuid, subs: [] });
        map.get(key).subs.push({ device, fav });
      }
    }
    return map;
  }

  async tick() {
    const now = this.now();
    const targets = this.targets(await this.store.list());
    const due = [...targets].filter(([key]) => now - (this.last.get(key) || 0) >= this.everyMs)
      .sort((a, b) => (this.last.get(a[0]) || 0) - (this.last.get(b[0]) || 0))
      .slice(0, this.maxPerTick);

    for (const [key, t] of due) {
      if (!this.configured(t.game)) continue;   // este servidor no tiene la key de ese juego
      this.last.set(key, now);
      try {
        const p = await this.api.player(t.game, t.tag);
        const record = recordOf(p);
        const before = await this.store.getKV(`trophy:${key}`);
        await this.store.putKV(`trophy:${key}`, { record, trophies: Number(p.trophies) || 0, at: now });
        if (before && record > before.record) await this.notify(t, { name: p.name, record, delta: record - before.record }, now);
      } catch (e) {
        this.log.warn(`Trofeos: no pude leer a un jugador (${e.code || e.message})`);   // un error puntual no frena a los demás
      }
    }
  }

  async notify(target, info, now) {
    const messages = [], owners = [];
    for (const { device, fav } of target.subs) {
      const s = device.settings || {};
      if (isQuiet(s, now)) continue;
      const locale = s.locale || "es";
      const name = info.name || (fav.riotId || "").split("#")[0] || "Kairo";
      messages.push({
        to: device.pushToken, ...text.trophyText(locale, { name, record: info.record, delta: info.delta }), sound: "default", priority: "high", channelId: "progress", ttl: 6 * 3600,
        data: { type: "trophy_record", game: target.game, puuid: fav.puuid, region: "global", riotId: fav.riotId },
      });
      owners.push(device);
    }
    if (!messages.length) return;
    const results = await this.push.send(messages);
    for (let i = 0; i < results.length; i++) {
      if (!results[i].ok && results[i].error === "DeviceNotRegistered") await this.store.remove(owners[i].id);
    }
  }
}

module.exports = { TrophyTracker, recordOf };
