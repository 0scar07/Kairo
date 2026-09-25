const fs = require("node:fs");
const path = require("node:path");

/**
 * Almacén de dispositivos en un archivo JSON. Sirve para desarrollo y para un servidor con disco propio.
 * En hostings con disco efímero (Render gratis) el archivo se pierde al reiniciar: allí usa DATABASE_URL (Postgres).
 *
 * Todo vive en memoria y se escribe al disco de forma atómica (archivo temporal + renombrar) con un pequeño retraso
 * para agrupar cambios seguidos. Un archivo dañado no tumba el servidor: se guarda aparte y se empieza vacío.
 */
class JsonStore {
  constructor({ file, flushMs = 200 }) {
    this.kind = "json";
    this.file = file;
    this.flushMs = flushMs;
    this.devices = new Map();
    this.watch = new Map();     // estado del vigilante por jugador (puuid)
    this.rank = new Map();      // historial de rango: puuid -> fotos diarias ordenadas por día
    this.kv = new Map();        // estado suelto de los rastreadores (trofeos): clave -> documento
    this.track = new Map();     // a quién se le guarda el historial: puuid -> { puuid, region, lastSeen }
    this.timer = null;
    this.writing = Promise.resolve();
  }

  async init() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    if (!fs.existsSync(this.file)) return;
    try {
      const data = JSON.parse(fs.readFileSync(this.file, "utf8"));
      for (const d of Array.isArray(data.devices) ? data.devices : []) this.devices.set(d.id, d);
      for (const w of Array.isArray(data.watch) ? data.watch : []) this.watch.set(w.puuid, w);
      for (const r of Array.isArray(data.rank) ? data.rank : []) this.rank.set(r.puuid, (this.rank.get(r.puuid) || []).concat(r));
      for (const t of Array.isArray(data.track) ? data.track : []) this.track.set(t.puuid, t);
      for (const k of Array.isArray(data.kv) ? data.kv : []) this.kv.set(k.key, k.doc);
    } catch (e) {
      const broken = `${this.file}.dañado-${Date.now()}`;
      fs.renameSync(this.file, broken);
      console.warn(`El archivo de dispositivos estaba dañado (${e.message}); lo guardé en ${broken} y empiezo vacío`);
    }
  }

  async count() { return this.devices.size; }
  async get(id) { const d = this.devices.get(id); return d ? structuredClone(d) : null; }
  async getByToken(token) {
    for (const d of this.devices.values()) if (d.pushToken === token) return structuredClone(d);
    return null;
  }
  async list() { return [...this.devices.values()].map(d => structuredClone(d)); }

  // Un token de notificaciones pertenece a un solo dispositivo: si otro lo tenía, se elimina
  async put(doc) {
    for (const [id, d] of this.devices) if (d.pushToken === doc.pushToken && id !== doc.id) this.devices.delete(id);
    this.devices.set(doc.id, structuredClone(doc));
    this.schedule();
  }

  async remove(id) {
    const existed = this.devices.delete(id);
    if (existed) this.schedule();
    return existed;
  }

  // Estado del vigilante: qué partida tiene cada jugador vigilado y qué avisos ya se enviaron
  async listWatch() { return [...this.watch.values()].map(w => structuredClone(w)); }
  async putWatch(state) { this.watch.set(state.puuid, structuredClone(state)); this.schedule(); }
  async removeWatch(puuid) { if (this.watch.delete(puuid)) this.schedule(); }

  // Historial de rango: una foto por jugador y día (la última del día reemplaza a las anteriores)
  async putRank(doc) {
    const list = (this.rank.get(doc.puuid) || []).filter(r => r.day !== doc.day);
    list.push(structuredClone(doc));
    list.sort((a, b) => (a.day < b.day ? -1 : 1));
    this.rank.set(doc.puuid, list.slice(-400));
    this.schedule();
  }
  async listRank(puuid, sinceDay = "0000-00-00") { return (this.rank.get(puuid) || []).filter(r => r.day >= sinceDay).map(r => structuredClone(r)); }
  async latestRank(puuid) { const l = this.rank.get(puuid) || []; return l.length ? structuredClone(l[l.length - 1]) : null; }

  async getKV(key) { const d = this.kv.get(key); return d ? structuredClone(d) : null; }
  async putKV(key, doc) { this.kv.set(key, structuredClone(doc)); this.schedule(); }

  async touchTrack(items, now) {
    for (const { puuid, region } of items) this.track.set(puuid, { puuid, region, lastSeen: now });
    this.schedule();
  }
  async listTrack(sinceMs) { return [...this.track.values()].filter(t => t.lastSeen >= sinceMs).map(t => ({ ...t })); }

  schedule() {
    if (this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; this.flush(); }, this.flushMs);
    this.timer.unref?.();
  }

  flush() {
    const tmp = `${this.file}.tmp`;
    const body = JSON.stringify({ version: 1, devices: [...this.devices.values()], watch: [...this.watch.values()], rank: [...this.rank.values()].flat(), track: [...this.track.values()], kv: [...this.kv].map(([key, doc]) => ({ key, doc })) });
    this.writing = this.writing
      .then(() => fs.promises.writeFile(tmp, body).then(() => fs.promises.rename(tmp, this.file)))
      .catch(e => console.error("No pude guardar los dispositivos:", e.message));
    return this.writing;
  }

  async close() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    await this.flush();
  }
}

module.exports = { JsonStore };
