require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const { HttpError, errorHandler } = require("./lib/riot");
const { REGIONS, DEFAULT_REGION } = require("./lib/regions");
const lolRouter = require("./routes/lol");
const tftRouter = require("./routes/tft");

if (!process.env.RIOT_API_KEY) {
  console.error("Falta RIOT_API_KEY en server/.env (ver .env.example)");
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, regions: Object.keys(REGIONS), defaultRegion: DEFAULT_REGION }));

// Rutas por juego: /lol/... y /tft/...  (todas aceptan ?region=la1|la2|na1|br1|euw1|kr...)
app.use("/lol", lolRouter);
app.use("/tft", tftRouter);

// Alias antiguos (/account, /summoner, /ranked, /matches, /match) = /lol/...
// Se mantienen mientras alguna versión de la app los use; avisan una vez por ruta.
const LEGACY_ROUTES = new Set(["account", "summoner", "ranked", "matches", "match"]);
const warned = new Set();
app.use((req, _res, next) => {
  const route = req.path.split("/")[1];
  if (LEGACY_ROUTES.has(route) && !warned.has(route)) {
    warned.add(route);
    console.warn(`Ruta antigua "/${route}/..." usada: es un alias de "/lol/${route}/..."`);
  }
  next();
}, lolRouter);

app.use((_req, _res, next) => next(new HttpError(404, "Ruta no encontrada")));
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Backend corriendo en http://localhost:${PORT}`));
