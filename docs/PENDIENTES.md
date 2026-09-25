# Pendientes y mejoras

## Antes de publicar
- [ ] **Regenerar las keys de Riot** que alguna vez estuvieron en el código o en el historial de git (una key que estuvo en un commit público sigue visible aunque se borre después) y, si quieres, limpiar el historial.
- [ ] **Desplegar el backend**: ya está listo (`render.yaml`, `Dockerfile`, límite de peticiones, CORS). Sigue [DESPLIEGUE.md](DESPLIEGUE.md). Con una key de desarrollo solo sirve para pruebas (caduca a las 24 h): pide una *Personal* o *Production API Key* a Riot.
- [ ] Registrar el producto en el portal de Riot y pedir la key ([RIOT-FORMULARIO.md](RIOT-FORMULARIO.md)); activar GitHub Pages (Settings → Pages → `main` / `docs`).
- [ ] **Habilitar las APIs de TFT** en el producto de Riot (hoy la key responde 403 en `tft-summoner`, `tft-league` y `tft-match`); mientras tanto, TFT muestra un error en la app.
- [x] Cola de salida hacia Riot que respeta el cupo de la key.
- [ ] **Actualizaciones por internet (EAS Update)**: corregir la app sin compilar un APK nuevo. Requiere `expo-updates` y un build nuevo con esa dependencia.
- [ ] Gráfico de oro y experiencia por minuto en el detalle de partida (match-v5 timeline; tu key ya tiene acceso).
- [ ] Nivel y puntos de desafíos en el perfil (lol-challenges-v1; tu key ya tiene acceso).
- [ ] Si se publica para el público: pedir una key de **producción** e integrar **RSO** para "Mi perfil" (ver las reglas de Riot en [RIOT-FORMULARIO.md](RIOT-FORMULARIO.md)); Valorant requiere RSO y no admite keys personales.
- [ ] Revisar el aviso legal, buscar el nombre "Kairo" en Play Store / App Store y en el registro de marcas.
- [ ] `eas init` de nuevo: el `projectId` de EAS sigue ligado al slug antiguo (`ggtracker`). El paquete Android sigue siendo `com.camavingaaa.ggtracker`; cámbialo si quieres identidad nueva.
- [x] Límite de peticiones y CORS configurable en el backend.
- [ ] Probar el `Dockerfile` (no había Docker instalado) y el despliegue real en Render.
- [ ] Base de datos solo si hace falta: favoritos sincronizados entre dispositivos (cuentas + Postgres/Supabase), caché persistente (Redis) o historial propio de LP.
- [ ] Mostrar "el servidor está despertando…" cuando el plan gratuito de Render tarda en responder.
- [x] Mostrar los juegos no habilitados como "PRONTO" (detección automática con `/health`).
- [ ] Actualizar `expo` al último parche (`npx expo install expo@~54.0.37`).

## Funcionalidad
- [x] Partida en vivo de LoL probada con una partida real (Flex, 10 jugadores con rango, runas, hechizos y baneos).
- [ ] Probar Fortnite, Apex Legends y PUBG con datos reales (se construyeron con su documentación y datos de prueba; Dota 2 sí está probado con OpenDota): verificar campos e imágenes.
- [ ] Dota 2: partida detallada, tiempo en vivo y nombres de héroes en otros idiomas (Valve datafeed).
- [ ] Probar los juegos de Supercell con datos reales (se construyeron con la documentación y con datos de prueba): verificar los campos y los íconos de Brawlify.
- [ ] Supercell: clanes (`/clans/:tag`), campeones de Brawl Stars por poder de estrella/gadget, cartas y evoluciones de Clash Royale, tropas y hechizos de Clash of Clans.
- [ ] **Valorant**, cuando Riot apruebe una production key (`val-match-v1`).
- [ ] Endpoint agregado `/lol/profile/...` para reducir las ~14 peticiones por perfil.
- [ ] Filtrar por cola (Solo/Dúo, Flex, ARAM…) en el historial de LoL.
- [ ] Persistir en caché local el último perfil visto (modo sin conexión).
- [ ] TFT: aumentos con ícono y nombre (Data Dragon `tft-augments`), objetos por unidad, y datos de sets antiguos (Data Dragon solo trae los actuales; hoy usan un placeholder con iniciales).
- [ ] Comparar dos jugadores; gráfico de LP en el tiempo (requiere guardar historial).
- [ ] Notificaciones cuando un favorito sube o baja de rango.
- [ ] Más regiones (SEA: `ph2`, `sg2`, `th2`, `tw2`, `vn2`) en el selector; el backend ya las acepta.
- [ ] Traducir nombres de campeones/objetos (Data Dragon `es_MX`) y soporte de idioma.
- [ ] **Notificaciones de partida en vivo (solo LoL, push solo Android por ahora).** Avisar cuando un favorito entra en partida y al terminar, con banner fluido dentro de la app. Decisiones tomadas:
  - Banner: gooey real con Skia (versión Reanimated de reserva para la web).
  - Sin login: cada dispositivo se identifica con su token push y un secreto propio.
  - Infraestructura gratis: Render gratis + Neon (Postgres) + UptimeRobot llamando a `/health` cada 5 min, con un segundo pinger de respaldo (cron-job.org o GitHub Actions). Si falla mucho, Render Starter (~7 USD/mes) o Cloudflare Workers + D1.
  - Fases: 1) backend y base, 2) vigilante y push con prueba real, 3) app y permisos, 4) banner, 5) gooey Skia, 6) pantalla en vivo, 7) cierre y privacidad.
  - Necesita de ti: proyecto Firebase (FCM) subido a EAS, base en Neon y actualizar `privacy.html`.

## Calidad
- [ ] Probar en dispositivos reales (Android 12+ recorta el ícono del splash nativo) y ajustar tamaños/animaciones.
- [ ] Tests automáticos: hoy solo hay comprobaciones puntuales. Añadir Jest para `utils/`, `games/*/utils` y las rutas del backend.
- [ ] ESLint + Prettier con `eslint-plugin-react` (hoy solo hay `npm run verify` para imports y tokens).
- [ ] Accesibilidad: etiquetas en más botones, soporte de texto grande y de "reducir movimiento".
- [ ] Tema claro (hoy solo oscuro).
- [ ] Analítica y reporte de errores (Sentry).
- [x] Saltos de línea normalizados con `.gitattributes`.
- [ ] Comprobar que el workflow de CI (`.github/workflows/ci.yml`) pasa en GitHub: no pude ejecutarlo desde local.
- [ ] Añadir capturas reales de un dispositivo (las actuales son renders en navegador).
