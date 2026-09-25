const path = require("node:path");
const { JsonStore } = require("./json");
const { PostgresStore } = require("./postgres");

/**
 * Elige el almacén de dispositivos según el entorno:
 *  - DATABASE_URL definido -> Postgres (producción)
 *  - si no -> archivo JSON en DATA_DIR (por defecto server/data)
 */
function createStore(env = process.env) {
  if (env.DATABASE_URL) {
    const { Pool } = require("pg");
    // Neon y la mayoría de los Postgres gestionados exigen SSL; DATABASE_SSL=false lo desactiva (Postgres local)
    const ssl = env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false };
    return new PostgresStore({ pool: new Pool({ connectionString: env.DATABASE_URL, ssl, max: 4, idleTimeoutMillis: 30_000 }) });
  }
  const dir = env.DATA_DIR || path.join(__dirname, "..", "..", "data");
  return new JsonStore({ file: path.join(dir, "devices.json") });
}

module.exports = { createStore, JsonStore, PostgresStore };
