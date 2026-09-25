const { riotGet } = require("./riot");
const { platformHost } = require("./regions");
const PATHS = require("./paths");
const rank = require("./rank");
const text = require("./pushText");
const { isQuiet } = require("./watcher");

/**
 * Historial de rango de LoL. Una vez al día (cada 6 h para los favoritos de dispositivos registrados) guarda una foto del
 * rango Solo/Dúo y Flex de cada jugador rastreado. Se rastrea a:
 *  - los favoritos de todos los dispositivos registrados, y
 *  - cualquier jugador que alguien haya abierto en los últimos 30 días (la app avisa con GET /lol/history/:puuid),
 * con un tope para proteger el cupo de Riot. Con las fotos:
 *  - avisa cuando un favorito sube o baja de rango o entra en promoción (ajuste `rankAlerts`), y
 *  - manda el resumen semanal (ajuste `weekly`): el domingo entre las 18:00 y las 22:00 hora local del celular.
 */
const HOUR = 3_600_000, DAY = 24 * HOUR;

const defaultRiot = {
  ranked: (region, puuid) => riotGet(`${platformHost(region)}${PATHS.lol.ranked(puuid)}`, { ttl: 0 }),
};

class RankTracker {
  constructor({ store, push, riot = defaultRiot, now = Date.now, log = console, favEveryMs = 6 * HOUR, passiveEveryMs = DAY, trackWindowMs = 30 * DAY, maxTracked = 300, maxPerTick = 6 }) {
    Object.assign(this, { store, push, riot, now, log, favEveryMs, passiveEveryMs, trackWindowMs, maxTracked, maxPerTick });
    this.last = new Map();   // puuid -> instante de su última foto (se rellena al vuelo desde el almacén)
    this.stats = { snapshots: 0, alerts: 0, weekly: 0 };
  }

  // puuid -> { region, subs: [{ device, fav }] } con los favoritos de LoL de todos los dispositivos
  favorites(devices) {
    const map = new Map();
    for (const device of devices) {
      for (const fav of device.favorites || []) {
        if ((fav.game || "lol") !== "lol") continue;
        if (!map.has(fav.puuid)) map.set(fav.puuid, { region: fav.region, subs: [] });
        map.get(fav.puuid).subs.push({ device, fav });
      }
    }
    return map;
  }

  async lastAt(puuid) {
    if (!this.last.has(puuid)) this.last.set(puuid, (await this.store.latestRank(puuid))?.at ?? 0);
    return this.last.get(puuid);
  }

  // budget: cuántas consultas a Riot puede gastar el rastreador en esta tanda (ya limitado por quien lo llama)
  async tick(budget = this.maxPerTick) {
    const now = this.now();
    const devices = await this.store.list();
    const favs = this.favorites(devices);

    const targets = new Map();
    for (const [puuid, f] of favs) targets.set(puuid, { region: f.region, every: this.favEveryMs });
    for (const t of await this.store.listTrack(now - this.trackWindowMs)) {
      if (!targets.has(t.puuid)) targets.set(t.puuid, { region: t.region, every: this.passiveEveryMs });
    }

    // Los más atrasados primero, hasta el tope de jugadores rastreados
    const due = [];
    for (const [puuid, t] of [...targets].slice(0, this.maxTracked)) {
      const at = await this.lastAt(puuid);
      if (now - at >= t.every) due.push({ puuid, ...t, at });
    }
    due.sort((a, b) => a.at - b.at);

    let spent = 0;
    for (const t of due) {
      if (spent >= Math.min(budget, this.maxPerTick)) break;
      spent++;
      await this.snapshot(t, favs.get(t.puuid), now);
    }

    await this.weekly(devices, now);
    return { snapshots: spent };
  }

  async snapshot({ puuid, region }, fav, now) {
    let entries;
    try {
      entries = await this.riot.ranked(region, puuid);
    } catch (e) {
      if (["KEY_INVALID", "RATE_LIMITED", "BUSY"].includes(e.code)) throw e;   // frena la tanda entera (lo maneja quien llama)
      this.last.set(puuid, now);                                             // un error puntual no debe repetirse cada tanda
      this.log.warn(`Historial: no pude leer el rango de un jugador (${e.code || e.message})`);
      return;
    }
    const doc = { puuid, region, day: rank.dayKey(now), at: now, ...rank.snapshotFromEntries(entries) };
    const prev = await this.store.latestRank(puuid);
    await this.store.putRank(doc);
    this.last.set(puuid, now);
    this.stats.snapshots++;

    const change = prev && now - prev.at < 3 * DAY ? rank.rankChange(prev, doc) : null;
    if (change && fav) await this.notifyChange(fav, change, now);
  }

  async notifyChange(fav, change, now) {
    const messages = [], owners = [];
    for (const { device, fav: f } of fav.subs) {
      const s = device.settings || {};
      if (!s.enabled || !s.rankAlerts || isQuiet(s, now)) continue;
      const locale = s.locale || "es";
      const name = (f.riotId || "").split("#")[0] || "Kairo";
      messages.push({
        to: device.pushToken, ...text.rankChangeText(locale, { name, ...change }), sound: "default", priority: "high", channelId: "progress", ttl: 6 * 3600,
        data: { type: "rank_change", puuid: f.puuid, region: f.region, riotId: f.riotId, change: change.kind },
      });
      owners.push(device);
    }
    await this.deliver(messages, owners);
    this.stats.alerts += messages.length;
  }

  async weekly(devices, now) {
    for (const device of devices) {
      const s = device.settings || {};
      const lolFavs = (device.favorites || []).filter(f => (f.game || "lol") === "lol");
      if (!s.enabled || !s.weekly || !lolFavs.length) continue;
      const offset = s.quiet?.utcOffsetMinutes || 0;
      if (!rank.isWeeklyWindow(now, offset)) continue;
      const week = rank.isoWeek(now, offset);
      if (device.weeklySent === week) continue;

      // Comparación: la foto más reciente frente a la de hace ~una semana (entre 5 y 9 días atrás)
      const results = [];
      for (const fav of lolFavs) {
        const history = await this.store.listRank(fav.puuid, rank.dayKey(now - 9 * DAY));
        const latest = history[history.length - 1];
        const old = history.find(h => h.day >= rank.dayKey(now - 9 * DAY) && h.day <= rank.dayKey(now - 5 * DAY));
        const sum = latest && old ? rank.summarize(old, latest) : null;
        if (sum) results.push({ fav, ...sum });
      }
      results.sort((a, b) => Math.abs(b.lp) - Math.abs(a.lp) || b.games - a.games);

      // Se marca como enviado aunque no haya nada que contar, para no reintentar toda la tarde
      await this.store.put({ ...device, weeklySent: week });
      if (isQuiet(s, now) || !results.length) continue;
      const top = results[0];
      const locale = s.locale || "es";
      const name = (top.fav.riotId || "").split("#")[0] || "Kairo";
      await this.deliver([{
        to: device.pushToken, ...text.weeklyText(locale, { name, lp: top.lp, games: top.games, winrate: top.winrate, extra: results.length - 1 }),
        sound: "default", channelId: "progress", ttl: 12 * 3600,
        data: { type: "weekly", puuid: top.fav.puuid, region: top.fav.region, riotId: top.fav.riotId },
      }], [device]);
      this.stats.weekly++;
    }
  }

  // Envía y da de baja a los dispositivos cuyo token ya no existe
  async deliver(messages, owners) {
    if (!messages.length) return;
    const results = await this.push.send(messages);
    for (let i = 0; i < results.length; i++) {
      if (!results[i].ok && results[i].error === "DeviceNotRegistered") await this.store.remove(owners[i].id);
    }
  }
}

module.exports = { RankTracker, defaultRiot };
