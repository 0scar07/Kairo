require("dotenv").config();
const express = require("express");
const config = require("./lib/config");
const { HttpError, errorHandler, cache, limiter: riotLimiter } = require("./lib/riot");
const access = require("./lib/access");
const { REGIONS, DEFAULT_REGION } = require("./lib/regions");
const { securityHeaders, requestLogger, corsMiddleware, limiter } = require("./lib/middleware");
const lolRouter = require("./routes/lol");
const tftRouter = require("./routes/tft");
const { createSupercellRouter } = require("./routes/supercell");
const extra = require("./lib/extra");
const { createStore } = require("./lib/store");
const { createDevicesRouter } = require("./routes/devices");
const push = require("./lib/push");
const { Watcher } = require("./lib/watcher");

if (!process.env.RIOT_API_KEY) {
  console.error("Falta RIOT_API_KEY (en server/.env o en las variables de entorno del hosting). Ver .env.example");
  process.exit(1);
}

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", config.trustProxy);

app.use(securityHeaders);
app.use(requestLogger);
app.use(corsMiddleware);
app.use(express.json({ limit: "10kb" }));
app.use(limiter);

// La raíz no es una página web: solo identifica el servicio para quien abra la URL en el navegador
app.get("/", (_req, res) => res.json({
  name: "Kairo API",
  status: "ok",
  message: "Backend de Kairo (proxy a la API de Riot). No es una página web.",
  health: "/health",
  docs: "https://github.com/0scar07/Kairo",
}));

// Sin límite de peticiones: lo usan los hostings para comprobar que el servicio está vivo
app.get("/health", (_req, res) => res.json({
  ok: true,
  uptime: Math.round(process.uptime()),
  cacheEntries: cache.size,
  riotQueue: riotLimiter.stats(),
  // Qué juegos puede consultar la key (Riot habilita cada API por producto); la app oculta los que no
  games: access.games(),
  watcher: watcher.status(),
  regions: Object.keys(REGIONS),
  defaultRegion: DEFAULT_REGION,
}));

// Rutas por juego: /lol/... y /tft/...  (todas aceptan ?region=la1|la2|na1|br1|euw1|kr...)
app.use("/lol", lolRouter);
app.use("/tft", tftRouter);
// Supercell: /brawlstars, /clashroyale y /clashofclans (se activan al configurar su key)
app.use("/brawlstars", createSupercellRouter("brawlstars"));
app.use("/clashroyale", createSupercellRouter("clashroyale"));
app.use("/clashofclans", createSupercellRouter("clashofclans"));
// Dota 2, Fortnite, Apex Legends y PUBG (APIs de terceros; se activan al configurar su key, salvo Dota 2)
for (const [id, module] of Object.entries(extra.ROUTES)) app.use(`/${id}`, module.router);

// Dispositivos para las notificaciones (Postgres si hay DATABASE_URL; si no, un archivo JSON local).
// Si el almacén no arranca, el resto de la API sigue funcionando y solo /devices responde 503.
const store = createStore();
const storeReady = store.init().then(() => console.log(`   dispositivos: almacén ${store.kind}`)).catch(e => {
  console.error("No pude iniciar el almacén de dispositivos:", e.message);
  throw e;
});
storeReady.catch(() => {});
app.use("/devices", (_req, _res, next) => storeReady.then(() => next(), () => next(new HttpError(503, "Las notificaciones no están disponibles ahora", { code: "DEVICES_UNAVAILABLE" }))),
  createDevicesRouter(store, { maxDevices: config.maxDevices, push }));

// Vigilante: revisa a los favoritos con alertas y manda las notificaciones (solo si el almacén arrancó)
const watcher = new Watcher({ store, push, maxPerTick: config.watchMaxPerTick, canWatch: () => access.games().lol !== false });
storeReady.then(() => { if (config.watcherEnabled) watcher.start(config.watchIntervalMs); }).catch(() => {});

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

app.use((_req, _res, next) => next(new HttpError(404, "Ruta no encontrada", { code: "ROUTE_NOT_FOUND" })));
app.use(errorHandler);

const server = app.listen(config.port, () => {
  console.log(`✅ Backend corriendo en el puerto ${config.port} (${config.isProduction ? "producción" : "desarrollo"})`);
  access.start();
  console.log(`   límite: ${config.rateLimitPerMin} peticiones/min por IP · CORS: ${config.corsOrigins.join(", ") || "abierto"}`);
});

// Cierre limpio: los hostings envían SIGTERM al reiniciar o redesplegar
function shutdown(signal) {
  console.log(`${signal} recibido: cerrando…`);
  watcher.stop();
  server.close(() => store.close().catch(() => {}).finally(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
