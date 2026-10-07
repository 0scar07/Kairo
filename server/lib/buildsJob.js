const { riotGet } = require("./riot");
const { platformHost, routingHost } = require("./regions");
const builds = require("./builds");

// Proceso de las builds de los Challenger: cada `intervalMs` toma unos pocos jugadores Challenger de una región (rota
// entre KR, EUW, NA y LAN), mira sus últimas partidas de Solo/Dúo y suma las nuevas al acumulado (lib/builds.js).
// Gasta poco del cupo de Riot (unas 25 consultas cada 20 min) y guarda el acumulado en el almacén (kv "builds:v1").

const KEY = "builds:v1";
const SEEN_KEY = "builds:seen:v1";
const MAX_SEEN = 4000;
const MIN = 60_000;

class BuildsJob {
  // ready: promesa del almacén listo (antes de eso no se lee nada, para no empezar vacío y pisar lo guardado)
  constructor({ store, ready = Promise.resolve(), get = riotGet, regions = ["kr", "euw1", "na1", "la1"], playersPerRun = 5, matchesPerRun = 20, log = console, now = Date.now }) {
    Object.assign(this, { store, ready, get, regions, playersPerRun, matchesPerRun, log, now });
    this.agg = null;
    this.seen = null;
    this.runs = 0;
    this.timer = null;
    this.running = false;
  }

  // Una sola carga aunque la pidan la ruta y la tanda a la vez. Si el almacén falla, se reintenta la próxima vez
  // (nunca se empieza vacío encima de lo guardado).
  load() {
    if (!this.loading) {
      this.loading = (async () => {
        await this.ready;
        const [agg, seen] = await Promise.all([this.store.getKV(KEY), this.store.getKV(SEEN_KEY)]);
        this.agg = agg?.patches ? agg : builds.emptyAggregate();
        this.seen = new Set(Array.isArray(seen?.ids) ? seen.ids : []);
      })().catch(e => { this.loading = null; throw e; });
    }
    return this.loading;
  }

  /** Lo acumulado (para la ruta /lol/builds) */
  async aggregate() {
    await this.load();
    return this.agg;
  }

  async tick() {
    if (this.running) return { added: 0 };
    this.running = true;
    let added = 0;
    try {
      await this.load();
      const region = this.regions[this.runs % this.regions.length];
      const league = await this.get(`${platformHost(region)}/lol/league/v4/challengerleagues/by-queue/RANKED_SOLO_5x5`, { ttl: 30 * MIN });
      const players = (league.entries || []).filter(e => e.puuid).sort((a, b) => b.leaguePoints - a.leaguePoints);
      // Cada vuelta por la región toma otro grupo de jugadores (los 50 mejores, de 5 en 5)
      const round = Math.floor(this.runs / this.regions.length);
      const start = (round * this.playersPerRun) % Math.max(1, Math.min(50, players.length));
      const chosen = players.slice(start, start + this.playersPerRun);
      this.runs++;

      const ids = [];
      for (const p of chosen) {
        const list = await this.get(`${routingHost(region)}/lol/match/v5/matches/by-puuid/${p.puuid}/ids?queue=420&start=0&count=5`, { ttl: 10 * MIN }).catch(() => []);
        for (const id of list) if (!this.seen.has(id) && !ids.includes(id)) ids.push(id);
      }
      for (const id of ids.slice(0, this.matchesPerRun)) {
        const match = await this.get(`${routingHost(region)}/lol/match/v5/matches/${id}`, { ttl: 60 * MIN }).catch(() => null);
        this.seen.add(id);
        if (match && builds.addMatch(this.agg, match)) added++;
      }
      if (this.seen.size > MAX_SEEN) this.seen = new Set([...this.seen].slice(-MAX_SEEN));
      this.agg.updatedAt = new Date(this.now()).toISOString();
      await this.store.putKV(KEY, this.agg);
      await this.store.putKV(SEEN_KEY, { ids: [...this.seen] });
    } catch (e) {
      this.log.warn(`Builds: la tanda falló (${e.code || e.message})`);
    } finally {
      this.running = false;
    }
    return { added };
  }

  start(intervalMs = 20 * MIN, firstDelayMs = 60_000) {
    if (this.timer) return;
    const schedule = delay => {
      this.timer = setTimeout(async () => {
        await this.tick();
        if (this.timer) schedule(intervalMs);
      }, delay);
      this.timer.unref?.();
    };
    schedule(firstDelayMs);
  }

  stop() { clearTimeout(this.timer); this.timer = null; }
}

module.exports = { BuildsJob, KEY };
