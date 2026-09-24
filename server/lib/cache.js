// Caché en memoria con caducidad (TTL), límite de entradas y deduplicación de peticiones en curso.
class TtlCache {
  constructor({ max = 400 } = {}) {
    this.max = max;
    this.store = new Map();     // clave -> { value, expires }
    this.inflight = new Map();  // clave -> Promise
  }

  get size() {
    return this.store.size;
  }

  get(key) {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (hit.expires < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    // Refresca la posición (los más usados sobreviven)
    this.store.delete(key);
    this.store.set(key, hit);
    return hit.value;
  }

  set(key, value, ttlMs) {
    this.store.set(key, { value, expires: Date.now() + ttlMs });
    while (this.store.size > this.max) {
      this.store.delete(this.store.keys().next().value);
    }
  }

  // Devuelve el valor en caché o ejecuta `loader` una sola vez aunque lleguen varias peticiones iguales.
  // Los errores no se guardan.
  async wrap(key, ttlMs, loader) {
    if (ttlMs <= 0) return loader();
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    if (this.inflight.has(key)) return this.inflight.get(key);

    const promise = loader()
      .then(value => { this.set(key, value, ttlMs); return value; })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, promise);
    return promise;
  }
}

module.exports = { TtlCache };
