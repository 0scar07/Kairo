# Pendientes y mejoras

## Antes de publicar
- [ ] **Regenerar las keys de Riot** que estuvieron en el repo (`RGAPI-9f64…` estuvo en `config.js` en GitHub; `RGAPI-45a0…` en `server.js`) y, si quieres, limpiar el historial de git.
- [ ] **Desplegar el backend** (Railway, Fly.io, Render…). Con una key de desarrollo solo sirve para pruebas; para publicar hay que pedir una *production key* a Riot.
- [ ] Revisar el aviso legal, buscar el nombre "Kairo" en Play Store / App Store y en el registro de marcas.
- [ ] `eas init` de nuevo: el `projectId` de EAS sigue ligado al slug antiguo (`ggtracker`). El paquete Android sigue siendo `com.camavingaaa.ggtracker`; cámbialo si quieres identidad nueva.
- [ ] Añadir límite de peticiones (rate limit) y CORS restringido al backend.
- [ ] Actualizar `expo` al último parche (`npx expo install expo@~54.0.37`).

## Funcionalidad
- [ ] **Valorant**, cuando Riot apruebe una production key (`val-match-v1`).
- [ ] Endpoint agregado `/lol/profile/...` para reducir las ~14 peticiones por perfil.
- [ ] Filtrar por cola (Solo/Dúo, Flex, ARAM…) en el historial de LoL.
- [ ] Persistir en caché local el último perfil visto (modo sin conexión).
- [ ] TFT: aumentos con ícono y nombre (Data Dragon `tft-augments`), objetos por unidad, y datos de sets antiguos (Data Dragon solo trae los actuales; hoy usan un placeholder con iniciales).
- [ ] Comparar dos jugadores; gráfico de LP en el tiempo (requiere guardar historial).
- [ ] Notificaciones cuando un favorito sube o baja de rango.
- [ ] Más regiones (SEA: `ph2`, `sg2`, `th2`, `tw2`, `vn2`) en el selector; el backend ya las acepta.
- [ ] Traducir nombres de campeones/objetos (Data Dragon `es_MX`) y soporte de idioma.

## Calidad
- [ ] Probar en dispositivos reales (Android 12+ recorta el ícono del splash nativo) y ajustar tamaños/animaciones.
- [ ] Tests automáticos: hoy solo hay comprobaciones puntuales. Añadir Jest para `utils/`, `games/*/utils` y las rutas del backend.
- [ ] ESLint + Prettier con `eslint-plugin-react` (hoy no hay linter configurado).
- [ ] Accesibilidad: etiquetas en más botones, soporte de texto grande y de "reducir movimiento".
- [ ] Tema claro (hoy solo oscuro).
- [ ] Analítica y reporte de errores (Sentry).
- [ ] Los saltos de línea del repo mezclan LF/CRLF: añadir `.gitattributes`.
