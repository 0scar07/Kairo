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

  schedule() {
    if (this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; this.flush(); }, this.flushMs);
    this.timer.unref?.();
  }

  flush() {
    const tmp = `${this.file}.tmp`;
    const body = JSON.stringify({ version: 1, devices: [...this.devices.values()], watch: [...this.watch.values()] });
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
