// Configuración del servidor a partir de variables de entorno (ver .env.example)
const int = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const isProduction = process.env.NODE_ENV === "production";

module.exports = {
  isProduction,
  port: int(process.env.PORT, 3000),
  // Peticiones por minuto y por IP (un perfil completo hace ~14)
  rateLimitPerMin: int(process.env.RATE_LIMIT_PER_MIN, 240),
  // Tope de dispositivos registrados para notificaciones (protege el plan gratuito de la base de datos)
  maxDevices: int(process.env.MAX_DEVICES, 5000),
  // Orígenes web permitidos, separados por comas. Vacío = cualquiera (las apps nativas no envían Origin)
  corsOrigins: (process.env.CORS_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean),
  // Detrás de un proxy (Render, Railway, Fly…) hay que confiar en él para ver la IP real del cliente
  trustProxy: process.env.TRUST_PROXY !== undefined ? int(process.env.TRUST_PROXY, 0) : (isProduction ? 1 : 0),
};
