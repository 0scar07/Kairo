// Carga las imágenes de las notificaciones de forma segura: si el motor de dibujo (@napi-rs/canvas, con binarios nativos)
// no está disponible en este servidor, las notificaciones salen igual pero sin imagen, y el resto de la API sigue arriba.
let art;
try {
  art = require("./art");
} catch (e) {
  console.warn("Imágenes de notificaciones desactivadas:", e.message);
  art = { bannerUrl: () => null };
}
module.exports = art;
