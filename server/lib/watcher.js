const { riotGet } = require("./riot");
const { platformHost, routingHost, platformId } = require("./regions");
const { championName } = require("./ddragon");
const text = require("./pushText");

/**
 * Vigilante de partidas (solo LoL): cada tanda revisa, sin repetir jugadores, a los favoritos con alertas de todos los
 * dispositivos y avisa UNA vez al entrar en partida y UNA vez al terminar (con el resultado).
 *
 *  - Presupuesto: como máximo `maxPerTick` consultas a Riot por tanda, más las de los resultados pendientes. Los jugadores
 *    se rotan por el que lleva más tiempo sin revisarse, así todos se cubren aunque no quepan en una sola tanda.
 *  - Anti-spam: por jugador se guarda qué partida ya avisó (`notifiedStart`) y qué resultados (`notifiedEnd`). Ese estado
 *    vive en el almacén (Postgres), así que un reinicio del servidor no repite avisos. Se guarda ANTES de enviar: si el
 *    servidor cae justo entonces se pierde un aviso, pero nunca se duplica.
 *  - Resultado: cuando el jugador deja de estar en partida se busca esa partida en match-v5 con reintentos, porque tarda
 *    unos minutos en aparecer.
 */

// Reintentos del resultado, contados desde que se notó el final de la partida
const RESULT_DELAYS_MS = [3, 5, 8, 12, 18, 25].map(m => m * 60_000);
const RECEIPT_AFTER_MS = 15 * 60_000;
const MAX_PENDING = 5;

// Aborta la tanda entera (la key no sirve o Riot está limitando): seguir solo empeoraría las cosas
class StopTick extends Error {}

// Adaptador a Riot: normaliza lo que necesita el vigilante
const defaultRiot = {
  async live(region, puuid) {
    try {
      const g = await riotGet(`${platformHost(region)}/lol/spectator/v5/active-games/by-summoner/${puuid}`, { ttl: 0, notFound: { message: "No está en partida", code: "NOT_IN_GAME" } });
      const me = (g.participants || []).find(p => p.puuid === puuid);
      return { inGame: true, gameId: g.gameId, queueId: g.gameQueueConfigId ?? null, championId: me?.championId ?? null, length: g.gameLength || 0 };
    } catch (e) {
      if (e.status === 404) return { inGame: false };
      throw e;
    }
  },
  // null si la partida todavía no está disponible
  async match(region, puuid, gameId) {
    let m;
    try {
      m = await riotGet(`${routingHost(region)}/lol/match/v5/matches/${platformId(region)}_${gameId}`, { ttl: 0, notFound: { message: "Partida no disponible", code: "MATCH_NOT_FOUND" } });
    } catch (e) {
      if (e.status === 404) return null;
      throw e;
    }
    const me = (m.info?.participants || []).find(p => p.puuid === puuid);
    if (!me) return null;
    return {
      win: Boolean(me.win), championId: me.championId, kills: me.kills, deaths: me.deaths, assists: me.assists,
      queueId: m.info.queueId ?? null,
      remake: Boolean(me.gameEndedInEarlySurrender) || (m.info.gameDuration || 0) < 300,   // repetidas: no merecen aviso
    };
  },
};

// ¿Es hora silenciosa para este dispositivo? `utcOffsetMinutes` es la hora local menos UTC (Bogotá = -300)
function isQuiet(settings, nowMs) {
  const q = settings?.quiet;
  if (!q?.enabled) return false;
  const [fh, fm] = q.from.split(":").map(Number);
  const [th, tm] = q.to.split(":").map(Number);
  const from = fh * 60 + fm, to = th * 60 + tm;
  if (from === to) return false;
  const local = new Date(nowMs + (q.utcOffsetMinutes || 0) * 60_000);
  const cur = local.getUTCHours() * 60 + local.getUTCMinutes();
  return from < to ? cur >= from && cur < to : cur >= from || cur < to;   // el rango puede cruzar la medianoche
}

const newState = (puuid, region) => ({ puuid, region, current: null, pending: [], lastCheckedAt: 0, notifiedStart: null, notifiedEnd: [] });

class Watcher {
  constructor({ store, push, riot = defaultRiot, names = championName, now = Date.now, maxPerTick = 40, canWatch = () => true, log = console }) {
    Object.assign(this, { store, push, riot, names, now, maxPerTick, canWatch, log });
    this.running = false;
    this.timer = null;
    this.receiptQueue = [];   // avisos enviados cuyo recibo falta por revisar (en memoria: si se pierde, no pasa nada grave)
    this.stats = { lastTickAt: null, lastTickMs: 0, tracked: 0, checked: 0, sent: 0, ticks: 0 };
  }

  // puuid -> { region, subs: [{ device, fav }] } solo con quien de verdad quiere avisos
  targets(devices) {
    const map = new Map();
    for (const device of devices) {
      const s = device.settings || {};
      if (!s.enabled || (!s.notifyStart && !s.notifyEnd)) continue;
      for (const fav of device.favorites || []) {
        if (fav.muted) continue;
        if (!map.has(fav.puuid)) map.set(fav.puuid, { region: fav.region, subs: [] });
        map.get(fav.puuid).subs.push({ device, fav });
      }
    }
    return map;
  }

  async tick() {
    if (this.running || !this.canWatch()) return;
    this.running = true;
    const startedAt = this.now();
    let checked = 0, sent0 = this.stats.sent;
    try {
      const targets = this.targets(await this.store.list());
      const states = new Map((await this.store.listWatch()).map(s => [s.puuid, s]));

      // Jugadores que ya nadie vigila: se olvida su estado
      for (const puuid of [...states.keys()]) {
        if (!targets.has(puuid)) { await this.store.removeWatch(puuid); states.delete(puuid); }
      }

      let budget = this.maxPerTick;
      const spend = () => { budget--; checked++; };

      // 1) Resultados pendientes que ya toca reintentar
      for (const state of states.values()) {
        for (const pending of [...state.pending]) {
          if (budget <= 0 || this.now() < pending.nextAt) continue;
          spend();
          await this.guard(() => this.checkResult(state, pending, targets.get(state.puuid)));
        }
      }

      // 2) ¿Quién está en partida? Primero a quien más tiempo lleva sin revisarse
      const order = [...targets.keys()].sort((a, b) => (states.get(a)?.lastCheckedAt || 0) - (states.get(b)?.lastCheckedAt || 0));
      for (const puuid of order) {
        if (budget <= 0) break;
        spend();
        await this.guard(() => this.checkLive(states.get(puuid) || newState(puuid, targets.get(puuid).region), targets.get(puuid)));
      }

      await this.checkReceipts();
      this.stats.tracked = targets.size;
    } catch (e) {
      if (!(e instanceof StopTick)) this.log.error("Vigilante: la tanda falló:", e.message);
    } finally {
      Object.assign(this.stats, { lastTickAt: new Date(startedAt).toISOString(), lastTickMs: this.now() - startedAt, checked, ticks: this.stats.ticks + 1 });
      this.running = false;
    }
    return { checked, sent: this.stats.sent - sent0 };
  }

  // Un jugador con problemas no debe frenar a los demás, salvo que el problema sea de la key o del límite de Riot
  async guard(fn) {
    try {
      await fn();
    } catch (e) {
      if (["KEY_INVALID", "RATE_LIMITED", "BUSY"].includes(e.code)) {
        this.log.warn(`Vigilante: tanda detenida (${e.code})`);
        throw new StopTick();
      }
      this.log.warn(`Vigilante: no pude revisar a un jugador (${e.code || e.message})`);
    }
  }

  async checkLive(state, target) {
    state.region = target.region;
    const live = await this.riot.live(state.region, state.puuid);
    const now = this.now();
    let notify = false;

    if (live.inGame) {
      if (state.current && state.current.gameId !== live.gameId) this.endGame(state, now);   // jugó otra partida entre revisiones
      if (!state.current) state.current = { gameId: live.gameId, queueId: live.queueId, championId: live.championId };
      if (state.notifiedStart !== live.gameId) { state.notifiedStart = live.gameId; notify = true; }
    } else if (state.current) {
      this.endGame(state, now);
    }

    state.lastCheckedAt = now;
    await this.store.putWatch(state);   // primero se guarda, luego se avisa: nunca se duplica
    if (notify) await this.notify(target, "start", { gameId: live.gameId, queueId: live.queueId, championId: live.championId, minutes: Math.floor((live.length || 0) / 60) });
  }

  endGame(state, now) {
    const g = state.current;
    state.current = null;
    if (!g || state.notifiedEnd.includes(g.gameId)) return;
    state.pending.push({ ...g, endedAt: now, attempts: 0, nextAt: now + RESULT_DELAYS_MS[0] });
    state.pending = state.pending.slice(-MAX_PENDING);
  }

  async checkResult(state, pending, target) {
    const result = await this.riot.match(state.region, state.puuid, pending.gameId);
    const drop = () => { state.pending = state.pending.filter(p => p !== pending && p.gameId !== pending.gameId); };

    if (!result) {
      pending.attempts += 1;
      if (pending.attempts >= RESULT_DELAYS_MS.length) drop();   // se rinde: quizá fue una partida repetida o Riot no la publicó
      else pending.nextAt = pending.endedAt + RESULT_DELAYS_MS[pending.attempts];
      await this.store.putWatch(state);
      return;
    }

    drop();
    const alreadySent = state.notifiedEnd.includes(pending.gameId);
    if (!alreadySent) state.notifiedEnd = [...state.notifiedEnd, pending.gameId].slice(-10);
    await this.store.putWatch(state);
    if (!alreadySent && !result.remake && target) await this.notify(target, "end", { gameId: pending.gameId, ...result });
  }

  // Arma un mensaje por dispositivo (su idioma, sus ajustes, su horario silencioso) y los envía juntos
  async notify(target, kind, data) {
    const now = this.now();
    const messages = [], owners = [];
    for (const { device, fav } of target.subs) {
      const s = device.settings;
      if (kind === "start" ? !s.notifyStart : !s.notifyEnd) continue;
      if (isQuiet(s, now)) continue;
      const locale = s.locale || "es";
      const name = (fav.riotId || "").split("#")[0] || "Kairo";
      const champion = await this.names(data.championId, locale);
      const content = kind === "start"
        ? text.startText(locale, { name, queueId: data.queueId, champion, minutes: data.minutes })
        : text.endText(locale, { name, win: data.win, champion, kills: data.kills, deaths: data.deaths, assists: data.assists, queueId: data.queueId });
      messages.push({
        to: device.pushToken, ...content, sound: "default", priority: "high", channelId: "live", categoryId: "live_game",
        ttl: kind === "start" ? 600 : 3600,
        data: { type: `live_${kind}`, puuid: fav.puuid, region: fav.region, gameId: data.gameId, riotId: fav.riotId },
      });
      owners.push(device);
    }
    if (!messages.length) return;

    const results = await this.push.send(messages);
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.ok) { this.stats.sent++; if (r.id) this.receiptQueue.push({ id: r.id, deviceId: owners[i].id, at: now }); }
      else if (r.error === "DeviceNotRegistered") await this.store.remove(owners[i].id);
    }
  }

  // Los recibos de Expo revelan tokens muertos (app desinstalada): esos dispositivos se dan de baja solos
  async checkReceipts() {
    const now = this.now();
    const due = this.receiptQueue.filter(r => now - r.at >= RECEIPT_AFTER_MS);
    if (!due.length) return;
    const known = await this.push.receipts(due.map(r => r.id));
    for (const r of due) {
      const rec = known[r.id];
      if (!rec && now - r.at < 4 * RECEIPT_AFTER_MS) continue;   // Expo aún no lo tiene: se reintenta después
      this.receiptQueue = this.receiptQueue.filter(x => x !== r);
      if (rec?.status === "error" && rec.details?.error === "DeviceNotRegistered") await this.store.remove(r.deviceId);
    }
  }

  start(intervalMs = 120_000, firstDelayMs = 20_000) {
    if (this.timer) return;
    const schedule = delay => {
      this.timer = setTimeout(async () => {
        await this.tick().catch(e => this.log.error("Vigilante:", e.message));
        if (this.timer) schedule(intervalMs);
      }, delay);
      this.timer.unref?.();
    };
    schedule(firstDelayMs);
  }

  stop() { clearTimeout(this.timer); this.timer = null; }

  status() { return { ...this.stats, running: this.timer !== null }; }
}

module.exports = { Watcher, isQuiet, RESULT_DELAYS_MS, defaultRiot };
