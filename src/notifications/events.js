// Canal interno de avisos "en vivo": las notificaciones que llegan con la app abierta se muestran como banner dentro
// de la app en vez de la notificación del sistema. Quien pinta el banner se suscribe con onLive.
const listeners = new Set();

export function onLive(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// event: { id, kind: "start" | "end" | "test", title, body, data }
export function emitLive(event) {
  listeners.forEach(fn => { try { fn(event); } catch (e) { console.warn("Oyente de avisos en vivo:", e.message); } });
}
