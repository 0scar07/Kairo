const cors = require("cors");
const rateLimit = require("express-rate-limit");
const config = require("./config");
const { HttpError } = require("./riot");
const { maskRoute } = require("./mask");

// Cabeceras de seguridad básicas
function securityHeaders(_req, res, next) {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
  });
  next();
}

// Registro de peticiones: método, ruta, estado y duración. Se enmascaran los nombres de jugador y los IDs largos
// (PUUID, ID de partida) para no dejar datos de jugadores en los logs.
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    if (req.path === "/health") return;
    const route = maskRoute(req.originalUrl);
    console.log(`${req.method} ${route} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
}

// CORS: solo importa para clientes web; las apps nativas no envían Origin
const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin || config.corsOrigins.length === 0 || config.corsOrigins.includes(origin)) return callback(null, true);
    callback(null, false);
  },
});

// Límite de peticiones por IP. Responde con el mismo formato de error que el resto ({ error, retryAfter })
const limiter = rateLimit({
  windowMs: 60_000,
  limit: config.rateLimitPerMin,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: req => req.path === "/health",
  handler(req, _res, next) {
    const retryAfter = Math.max(1, Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000));
    next(new HttpError(429, `Demasiadas solicitudes, reintenta en ${retryAfter} s`, { retryAfter }));
  },
});

module.exports = { securityHeaders, requestLogger, corsMiddleware, limiter };
