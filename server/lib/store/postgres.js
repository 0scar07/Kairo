/**
 * Almacén de dispositivos en Postgres (Neon, Supabase, Render, etc.). Es lo que se usa en producción, porque el disco de
 * los hostings gratuitos no persiste. El documento completo del dispositivo se guarda como JSON en una sola tabla;
 * el token va aparte y es único para poder buscarlo rápido.
 *
 * `pool` es cualquier objeto con la interfaz de `pg.Pool` (query y connect); se inyecta para poder probarlo.
 */
class PostgresStore {
  constructor({ pool }) {
    this.kind = "postgres";
    this.pool = pool;
  }

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS devices (
        id         text PRIMARY KEY,
        push_token text NOT NULL UNIQUE,
        doc        jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS watch (
        puuid      text PRIMARY KEY,
        doc        jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS rank_history (
        puuid text NOT NULL,
        day   text NOT NULL,
        doc   jsonb NOT NULL,
        PRIMARY KEY (puuid, day)
      )`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS rank_track (
        puuid     text PRIMARY KEY,
        region    text NOT NULL,
        last_seen bigint NOT NULL
      )`);
  }

  async count() {
    const { rows } = await this.pool.query("SELECT count(*)::int AS n FROM devices");
    return rows[0].n;
  }

  async get(id) {
    const { rows } = await this.pool.query("SELECT doc FROM devices WHERE id = $1", [id]);
    return rows[0]?.doc ?? null;
  }

  async getByToken(token) {
    const { rows } = await this.pool.query("SELECT doc FROM devices WHERE push_token = $1", [token]);
    return rows[0]?.doc ?? null;
  }

  async list() {
    const { rows } = await this.pool.query("SELECT doc FROM devices");
    return rows.map(r => r.doc);
  }

  // Un token de notificaciones pertenece a un solo dispositivo: si otro lo tenía, se elimina (todo en una transacción)
  async put(doc) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM devices WHERE push_token = $1 AND id <> $2", [doc.pushToken, doc.id]);
      await client.query(
        `INSERT INTO devices (id, push_token, doc, updated_at) VALUES ($1, $2, $3, now())
         ON CONFLICT (id) DO UPDATE SET push_token = EXCLUDED.push_token, doc = EXCLUDED.doc, updated_at = now()`,
        [doc.id, doc.pushToken, JSON.stringify(doc)],
      );
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }

  async remove(id) {
    const { rowCount } = await this.pool.query("DELETE FROM devices WHERE id = $1", [id]);
    return rowCount > 0;
  }

  // Estado del vigilante: qué partida tiene cada jugador vigilado y qué avisos ya se enviaron
  async listWatch() {
    const { rows } = await this.pool.query("SELECT doc FROM watch");
    return rows.map(r => r.doc);
  }

  async putWatch(state) {
    await this.pool.query(
      `INSERT INTO watch (puuid, doc, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (puuid) DO UPDATE SET doc = EXCLUDED.doc, updated_at = now()`,
      [state.puuid, JSON.stringify(state)],
    );
  }

  async removeWatch(puuid) {
    await this.pool.query("DELETE FROM watch WHERE puuid = $1", [puuid]);
  }

  // Historial de rango: una foto por jugador y día (la última del día reemplaza a las anteriores)
  async putRank(doc) {
    await this.pool.query(
      `INSERT INTO rank_history (puuid, day, doc) VALUES ($1, $2, $3)
       ON CONFLICT (puuid, day) DO UPDATE SET doc = EXCLUDED.doc`,
      [doc.puuid, doc.day, JSON.stringify(doc)],
    );
  }

  async listRank(puuid, sinceDay = "0000-00-00") {
    const { rows } = await this.pool.query("SELECT doc FROM rank_history WHERE puuid = $1 AND day >= $2 ORDER BY day", [puuid, sinceDay]);
    return rows.map(r => r.doc);
  }

  async latestRank(puuid) {
    const { rows } = await this.pool.query("SELECT doc FROM rank_history WHERE puuid = $1 ORDER BY day DESC LIMIT 1", [puuid]);
    return rows[0]?.doc ?? null;
  }

  async touchTrack(items, now) {
    for (const { puuid, region } of items) {
      await this.pool.query(
        `INSERT INTO rank_track (puuid, region, last_seen) VALUES ($1, $2, $3)
         ON CONFLICT (puuid) DO UPDATE SET region = EXCLUDED.region, last_seen = EXCLUDED.last_seen`,
        [puuid, region, now],
      );
    }
  }

  async listTrack(sinceMs) {
    const { rows } = await this.pool.query("SELECT puuid, region, last_seen FROM rank_track WHERE last_seen >= $1", [sinceMs]);
    return rows.map(r => ({ puuid: r.puuid, region: r.region, lastSeen: Number(r.last_seen) }));
  }

  async close() {
    await this.pool.end?.();
  }
}

module.exports = { PostgresStore };
