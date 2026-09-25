const { HttpError } = require("./errors");

/**
 * Cola de salida hacia Riot. Respeta los límites de la key (ej. 20 peticiones/s y 100 cada 2 min)
 * ESPERANDO en vez de fallar: las peticiones se despachan en orden en cuanto hay hueco.
 * Solo pasan por aquí las llamadas reales a Riot; lo que sale de la caché no gasta cupo.
 *
 *  - windows: [{ limit, ms }]  ventanas deslizantes (todas deben tener hueco)
 *  - maxWaitMs: si una petición espera más que esto, se rechaza con 429 (el servidor está saturado)
 *  - maxQueue: tope de peticiones en espera
 */
class RiotLimiter {
  constructor({ windows, maxWaitMs = 20_000, maxQueue = 300 } = {}) {
    this.windows = windows.map(w => ({ ...w, sent: [] }));   // sent: marcas de tiempo de lo despachado
    this.maxWaitMs = maxWaitMs;
    this.maxQueue = maxQueue;
    this.queue = [];
    this.timer = null;
    this.pausedUntil = 0;
  }

  // Tiempo (ms) que falta para que TODAS las ventanas tengan hueco
  waitTime(now) {
    let wait = Math.max(0, this.pausedUntil - now);
    for (const w of this.windows) {
      while (w.sent.length && w.sent[0] <= now - w.ms) w.sent.shift();
      if (w.sent.length >= w.limit) wait = Math.max(wait, w.sent[0] + w.ms - now);
    }
    return wait;
  }

  schedule(task) {
    if (this.queue.length >= this.maxQueue) {
      return Promise.reject(new HttpError(429, "El servidor está muy ocupado, reintenta en unos segundos", { retryAfter: 5, code: "BUSY" }));
    }
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject, at: Date.now() });
      this.pump();
    });
  }

  // Riot respondió 429: se detienen las salidas hasta que pase el Retry-After
  pause(ms) {
    this.pausedUntil = Math.max(this.pausedUntil, Date.now() + ms);
  }

  pump() {
    if (this.timer) return;
    while (this.queue.length) {
      const now = Date.now();
      const head = this.queue[0];
      if (now - head.at > this.maxWaitMs) {
        this.queue.shift();
        head.reject(new HttpError(429, "El servidor está muy ocupado, reintenta en unos segundos", { retryAfter: 5, code: "BUSY" }));
        continue;
      }
      const wait = this.waitTime(now);
      if (wait > 0) {
        this.timer = setTimeout(() => { this.timer = null; this.pump(); }, wait);
        this.timer.unref?.();
        return;
      }
      this.queue.shift();
      for (const w of this.windows) w.sent.push(now);
      Promise.resolve().then(head.task).then(head.resolve, head.reject);
    }
  }

  stats() {
    return { queued: this.queue.length, pausedMs: Math.max(0, this.pausedUntil - Date.now()) };
  }
}

// "18:1,95:120" -> [{ limit: 18, ms: 1000 }, { limit: 95, ms: 120000 }]
function parseLimits(text, fallback) {
  const parsed = String(text || "").split(",").map(s => s.trim()).filter(Boolean).map(s => {
    const [limit, seconds] = s.split(":").map(Number);
    return limit > 0 && seconds > 0 ? { limit, ms: seconds * 1000 } : null;
  });
  return parsed.length && parsed.every(Boolean) ? parsed : fallback;
}

// Por defecto, un poco por debajo de los límites reales (20/1 s y 100/120 s) para dejar margen
const DEFAULT_WINDOWS = [{ limit: 18, ms: 1000 }, { limit: 95, ms: 120_000 }];

module.exports = { RiotLimiter, parseLimits, DEFAULT_WINDOWS };
