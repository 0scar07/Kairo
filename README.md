<div align="center">

<img src="assets/icon.png" alt="Kairo" width="128" />

# KAIRO

**Cada partida cuenta.**

Estadísticas de **League of Legends** (con **partida en vivo**), **Teamfight Tactics**, **Brawl Stars**, **Clash Royale**, **Clash of Clans**, **Dota 2**, **Fortnite**, **Apex Legends** y **PUBG** en una app móvil premium, hecha con React Native y Expo.

![Expo SDK](https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react&logoColor=black)
![Node](https://img.shields.io/badge/Node-20%2B-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![Licencia](https://img.shields.io/badge/licencia-MIT-35E0A1)
![Estado](https://img.shields.io/badge/estado-en%20desarrollo-C89B3C)

[Capturas](#-capturas) · [Características](#-características) · [Puesta en marcha](#-puesta-en-marcha) · [Desplegar](#%EF%B8%8F-desplegar-en-la-nube) · [Arquitectura](#%EF%B8%8F-arquitectura) · [Roadmap](#%EF%B8%8F-roadmap)

<br />

<img src="docs/screenshots/hero.png" alt="Kairo: pantalla de carga, inicio con rotación gratuita, perfil de LoL con maestría y partidas" width="100%" />

<sub>Capturas renderizadas en un navegador móvil contra el backend real. En un celular los brillos y la háptica se ven distintos.</sub>

</div>

---

## ✨ Características

### Riot Games

| | League of Legends | Teamfight Tactics |
|---|---|---|
| **Rango** | Solo/Dúo y Flex con **emblema oficial**, LP, winrate y color del tier | Ranked, Double Up y Hyper Roll |
| **Historial** | Resultado, campeón, cola, KDA, CS y daño; carga más partidas y filtra por resultado y campeón | Posición final 1–8, cola y duración |
| **Detalle** | Los 10 jugadores con objetos, **hechizos y runas** | Los 8 jugadores con **rasgos y unidades con estrellas** |
| **Resumen** | Winrate, KDA promedio, racha y campeón más jugado; estadísticas por campeón | Posición promedio, top 4, victorias y gráfico de posiciones |
| **Maestría y rotación** | Top 3 de campeones con nivel y puntos, rotación gratuita de la semana y aviso de mantenimiento de tu región | (no aplica) |
| **En vivo** | **Partida en vivo**: aviso en el perfil y pantalla con los dos equipos, campeón, hechizos, runas, rango de cada jugador, baneos y cronómetro | (la API aún no está habilitada) |
| **Mi perfil** | Tu Riot ID con insignias y gráfico de KDA | Tu Riot ID |

TFT y LoL comparten la búsqueda por **Riot ID** con selector de **región** (LAN, LAS, NA, BR, EUW, EUNE, TR, KR, JP, OCE) que recuerda la última usada. **Valorant** llegará cuando Riot apruebe una *production key* (su API de partidas la exige).

### Supercell

| | Brawl Stars | Clash Royale | Clash of Clans |
|---|---|---|---|
| **Perfil** | Trofeos, récord, nivel y club | Trofeos, récord, nivel, clan y rol | Ayuntamiento, trofeos, liga y clan |
| **Progreso** | Victorias 3v3, solo y dúo; brawlers con poder, rango y trofeos | Victorias, derrotas, winrate, 3 coronas y Senda de leyendas | Guerra, donaciones, héroes y base del constructor |
| **Partidas** | Últimas 25 batallas con brawler, modo, mapa y trofeos | Últimas 30 batallas con marcador y trofeos; mazo actual con nivel y elixir | (la API no expone registro de batallas) |

Se buscan por **`#TAG`** y no tienen regiones.

### Dota 2, Fortnite, Apex Legends y PUBG

| | Dota 2 | Fortnite | Apex Legends | PUBG |
|---|---|---|---|---|
| **Búsqueda** | Nombre de Steam (con lista de resultados) o ID | Nombre + plataforma (Epic, PlayStation, Xbox) | Nombre + plataforma (PC, PlayStation, Xbox) | Nombre + plataforma (Steam, PlayStation, Xbox, Kakao) |
| **Rango** | **Medalla oficial** con estrellas y puesto en el ranking mundial | (no tiene) | Rango con su imagen, RP y nivel | Clasificatoria: tier, puntos y K/D |
| **Estadísticas** | Victorias, derrotas, winrate y héroes más jugados | Por modo (general, solo, dúos, tríos, escuadrones): victorias, K/D, top N, horas | Leyenda seleccionada con su banner, totales de bajas y daño, estado en línea | Por modo (FPP y TPP): victorias, K/D, daño medio, headshots, baja más lejana |
| **Partidas** | Últimas 20 con héroe, modo, K/D/A y duración | (la API solo da estadísticas) | (la API solo da estadísticas) | Últimas 8 con mapa, puesto, bajas y daño |

Dota 2 usa OpenDota (sin key); Fortnite, Apex y PUBG necesitan una key gratuita. Todas se buscan por nombre y cada una recuerda su plataforma.

### En toda la app

- **Cinco idiomas:** español, English, Português, Français y Deutsch. Se elige solo según el idioma del dispositivo o a mano en Ajustes, se recuerda, y cambia los textos, los nombres de los campeones de LoL (Data Dragon), los mensajes de error del servidor y el formato de los números.
- **Multijuego:** nueve juegos con un módulo cada uno; las pantallas genéricas no conocen ninguno. Cada juego se activa solo si el servidor tiene su key, y lo que no esté disponible aparece como "PRONTO" en vez de dar errores.
- **Favoritos** con tarjetas (ícono, rango o trofeos con el color del juego) y **búsquedas recientes**; funcionan igual en los cinco juegos.
- **Identidad visual:** acento propio por juego con transición suave, logos e íconos oficiales de cada juego y **cero emojis** (íconos vectoriales propios en SVG que toman el color del juego).
- **Pantalla de carga animada** con progreso real de arranque, aparición escalonada de las secciones, skeletons, estados vacíos amables y errores con botón de reintentar.
- **Háptica** y escala sutil al presionar; barra de navegación flotante tipo *pill*.

### Backend

- **La API key nunca va en la app:** las keys de Riot y Supercell viven en el servidor (`server/.env` o variables del hosting).
- **Caché** con deduplicación de peticiones (partidas terminadas 1 h), **cola de salida hacia Riot** que respeta el cupo de la key, límite de peticiones por IP y errores traducidos al español.
- **Detección de juegos habilitados:** un sondeo periódico consulta qué APIs permite tu key y las publica en `/health`.
- **Listo para la nube:** Dockerfile, `render.yaml`, cierre limpio y pruebas automáticas (`npm test`) con CI en GitHub Actions.

## 📸 Capturas

<table>
  <tr>
    <td align="center"><img src="docs/screenshots/splash.png" width="200" /><br /><sub><b>Carga animada</b></sub></td>
    <td align="center"><img src="docs/screenshots/home-lol.png" width="200" /><br /><sub><b>Inicio</b></sub></td>
    <td align="center"><img src="docs/screenshots/region.png" width="200" /><br /><sub><b>Región</b></sub></td>
    <td align="center"><img src="docs/screenshots/skeleton.png" width="200" /><br /><sub><b>Cargando</b></sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/profile-lol.png" width="200" /><br /><sub><b>Perfil de LoL</b></sub></td>
    <td align="center"><img src="docs/screenshots/matches-lol.png" width="200" /><br /><sub><b>Partidas</b></sub></td>
    <td align="center"><img src="docs/screenshots/match-detail-lol.png" width="200" /><br /><sub><b>Detalle con runas</b></sub></td>
    <td align="center"><img src="docs/screenshots/champions-lol.png" width="200" /><br /><sub><b>Campeones</b></sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/mastery-lol.png" width="200" /><br /><sub><b>Maestría de campeones</b></sub></td>
    <td align="center"><img src="docs/screenshots/rotation-lol.png" width="200" /><br /><sub><b>Rotación gratuita</b></sub></td>
    <td align="center"><img src="docs/screenshots/status-lol.png" width="200" /><br /><sub><b>Aviso de mantenimiento*</b></sub></td>
    <td align="center"><img src="docs/screenshots/favorites.png" width="200" /><br /><sub><b>Favoritos</b></sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/live-profile-lol.png" width="200" /><br /><sub><b>Aviso de partida en vivo</b></sub></td>
    <td align="center"><img src="docs/screenshots/live-blue-lol.png" width="200" /><br /><sub><b>Partida en vivo</b></sub></td>
    <td align="center"><img src="docs/screenshots/live-red-lol.png" width="200" /><br /><sub><b>Equipo rojo y baneos</b></sub></td>
    <td align="center"><img src="docs/screenshots/matches-flex-lol.png" width="200" /><br /><sub><b>Historial de Flex</b></sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/brawlstars-profile.png" width="200" /><br /><sub><b>Brawl Stars</b></sub></td>
    <td align="center"><img src="docs/screenshots/brawlstars-battles.png" width="200" /><br /><sub><b>Batallas de Brawl Stars</b></sub></td>
    <td align="center"><img src="docs/screenshots/clashroyale-profile.png" width="200" /><br /><sub><b>Clash Royale</b></sub></td>
    <td align="center"><img src="docs/screenshots/clashofclans-profile.png" width="200" /><br /><sub><b>Clash of Clans</b></sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/clashofclans-heroes.png" width="200" /><br /><sub><b>Héroes y clan</b></sub></td>
    <td align="center"><img src="docs/screenshots/home-tft.png" width="200" /><br /><sub><b>Inicio en TFT</b></sub></td>
    <td align="center"><img src="docs/screenshots/profile-tft.png" width="200" /><br /><sub><b>Perfil de TFT</b></sub></td>
    <td align="center"><img src="docs/screenshots/matches-tft.png" width="200" /><br /><sub><b>Posiciones y unidades</b></sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/match-detail-tft.png" width="200" /><br /><sub><b>Los 8 jugadores</b></sub></td>
    <td align="center"><img src="docs/screenshots/favorite.png" width="200" /><br /><sub><b>Favorito marcado</b></sub></td>
    <td align="center"><img src="docs/screenshots/home-recents.png" width="200" /><br /><sub><b>Recientes</b></sub></td>
    <td align="center"><img src="docs/screenshots/settings.png" width="200" /><br /><sub><b>Ajustes</b></sub></td>
  </tr>
</table>

<sub>Las capturas de Brawl Stars, Clash Royale y Clash of Clans usan datos reales de la API de Supercell. Las de TFT son anteriores al rediseño de íconos.</sub>

<sub>La partida en vivo es de una partida real de Flex, con los nombres tal como los muestra la app.</sub>

<sub>* El aviso de mantenimiento se muestra solo cuando Riot reporta uno activo; en la captura se simuló uno para enseñar el diseño. Las demás son datos reales de la API.</sub>

## 🧱 Stack

| Capa | Tecnología |
|------|------------|
| App | React Native 0.81 · Expo SDK 54 · React Navigation 7 |
| Animación | Reanimated 4 · SVG (`react-native-svg`) · `expo-haptics` |
| Diseño | Sistema propio de *tokens* (`src/theme`) · Sora + Inter (`@expo-google-fonts`) |
| Datos | Backend Express 5 · API de Riot · API de Supercell (vía proxy de IP fija) · OpenDota · Fortnite-API · Apex Legends Status · API de PUBG · Data Dragon (íconos, campeones, runas, TFT) · Brawlify (íconos de Brawl Stars) |
| Almacenamiento | AsyncStorage (favoritos, recientes, preferencias) |

## 🏗️ Arquitectura

```mermaid
flowchart LR
    App["📱 App Kairo<br/>(Expo)"] -- "?region=kr" --> API["🖥️ Backend Express<br/>caché + errores"]
    API -- "X-Riot-Token" --> Riot[["Riot Games API"]]
    API -- "Bearer key · IP fija" --> Proxy[["Proxy RoyaleAPI"]] --> SC[["API de Supercell<br/>(BS · CR · CoC)"]]
    App -- "íconos y datos estáticos" --> DD[["Data Dragon"]]
```

- Las **API keys (Riot y Supercell) nunca van en la app**: viven solo en `server/.env` o en las variables del hosting.
- El backend **cachea** (partidas terminadas 1 h) y traduce los errores de Riot a mensajes en español.
- Las pantallas genéricas **no conocen ningún juego**: leen todo de `src/games/`.

Más detalle, diagramas de secuencia y decisiones en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

## 🚀 Puesta en marcha

Necesitas **Node 20+** y una key de <https://developer.riotgames.com> (las de desarrollo caducan cada 24 h). Para Brawl Stars, Clash Royale y Clash of Clans, además, una key de cada portal de Supercell (opcional; mira [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md)).

### 1. Backend

```bash
cd server
npm install
cp .env.example .env        # y pon tu RIOT_API_KEY (y, si quieres, las de Supercell)
npm start                   # http://localhost:3000  ·  comprueba /health
```

### 2. App

```bash
npm install
npx expo start
```

En un dispositivo físico, apunta la app a la IP de tu PC (misma red Wi-Fi):

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.8:3000 npx expo start
```

### 3. Probar en el celular

- **Expo Go** *(lo más rápido)*: escanea el QR de `npm run phone` (equivale a `npx expo start --offline`, que evita pedir sesión de Expo). En Expo Go no se ve el splash nativo personalizado.
- **APK de prueba con EAS**:
  ```bash
  npm install -g eas-cli
  eas login
  eas init                                    # el proyecto cambió de slug: vuelve a enlazarlo
  eas build -p android --profile preview
  ```
  Edita `EXPO_PUBLIC_API_URL` en el perfil `preview` de [eas.json](eas.json): el APK solo llega a un backend accesible desde el celular.

> **HTTP en el APK:** `app.config.js` habilita el tráfico HTTP sin cifrar solo cuando `EXPO_PUBLIC_API_URL` empieza por `http://` (pruebas locales). Con un backend `https://` queda desactivado.

## ☁️ Desplegar en la nube

Para que la app funcione **sin tu PC encendida**, el backend tiene que estar en internet. No necesitas base de datos: los favoritos y preferencias se guardan en el propio celular.

El repo incluye [`render.yaml`](render.yaml) y un [`Dockerfile`](server/Dockerfile) (Render, Railway, Fly.io…). Resumen con Render:

1. **New → Blueprint** en <https://render.com>, elige este repositorio.
2. Pega tu `RIOT_API_KEY` cuando la pida y pulsa **Apply**.
3. Prueba `https://TU-URL.onrender.com/health` y pon esa URL en `EXPO_PUBLIC_API_URL`.

> ⚠️ Las keys de desarrollo de Riot **caducan a las 24 h**: para un backend permanente necesitas una *Personal* o *Production API Key*.

Guía completa (key de Riot, plan gratuito que se duerme, Railway/Fly, seguridad): [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md).

## ⚙️ Configuración

`server/.env`

| Variable | Descripción |
|----------|-------------|
| `RIOT_API_KEY` | Tu key de Riot. **Obligatoria**: si falta, el servidor no arranca |
| `PORT` | Puerto del backend (por defecto `3000`) |
| `DEFAULT_REGION` | Región si la app no envía `?region=` (por defecto `la1`) |
| `RATE_LIMIT_PER_MIN` | Peticiones por minuto y por IP (por defecto `240`) |
| `CORS_ORIGINS` | Orígenes web permitidos, separados por comas (vacío = abierto) |
| `TRUST_PROXY` | Proxies delante del servidor (por defecto `1` en producción) |
| `RIOT_RATE_LIMITS` | Cupo hacia Riot, `peticiones:segundos` (por defecto `18:1,95:120`) |
| `PROBE_RIOT_ID` | Cuenta pública para detectar qué juegos habilita la key (`Nombre#TAG@region`) |
| `BRAWLSTARS_API_KEY` · `CLASHROYALE_API_KEY` · `CLASHOFCLANS_API_KEY` | Keys de Supercell (opcionales: cada juego se activa al ponerla). Permite la IP `45.79.218.79` al crearlas |
| `*_API_BASE` | Otra URL base para esos juegos (por defecto los proxies de RoyaleAPI, que dan una IP fija) |
| `FORTNITE_API_KEY` · `APEX_API_KEY` · `PUBG_API_KEY` | Keys gratuitas de Fortnite-API, Apex Legends Status y PUBG (opcionales: cada juego se activa al ponerla) |
| `OPENDOTA_API_KEY` | Opcional: Dota 2 funciona sin key; con ella suben los límites de OpenDota |

App

| Variable | Descripción |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | URL del backend (por defecto `http://192.168.1.8:3000`) |

## 🔌 API del backend

Todas las rutas aceptan `?region=la1 · la2 · na1 · br1 · euw1 · eun1 · tr1 · kr · jp1 · oc1 …`

| Ruta | Descripción |
|------|-------------|
| `GET /health` | Estado, regiones, cola hacia Riot y **qué juegos habilita la key** (`games`) |
| `GET /{lol\|tft}/account/:gameName/:tagLine` | Cuenta Riot (PUUID) |
| `GET /{lol\|tft}/summoner/:puuid` | Perfil de invocador (ícono, nivel) |
| `GET /{lol\|tft}/ranked/:puuid` | Rangos del jugador |
| `GET /{lol\|tft}/matches/:puuid?start=0&count=10` | IDs de partidas (máx. 20 por página) |
| `GET /{lol\|tft}/match/:matchId` | Detalle de una partida |
| `GET /lol/mastery/:puuid?count=3` | Maestría: top de campeones y puntaje total |
| `GET /lol/rotation` | Rotación semanal gratuita (IDs de campeón) |
| `GET /lol/status` | Mantenimientos e incidencias del servidor de la región |
| `GET /lol/live/:puuid` | Partida en curso con el rango Solo/Dúo de cada jugador (`{ inGame: false }` si no está jugando) |

Supercell (sin región; el tag se acepta con o sin `#`):

| Ruta | Descripción |
|------|-------------|
| `GET /{brawlstars, clashroyale, clashofclans}/player/:tag` | Perfil del jugador |
| `GET /{brawlstars, clashroyale}/battles/:tag` | Últimas batallas (`{ items }`) |
| `GET /{brawlstars, clashroyale, clashofclans}/top?limit=10` | Mejores jugadores del mundo (sirve para descubrir tags) |

Otros juegos (por nombre; la plataforma va en `?platform=`):

| Ruta | Descripción |
|------|-------------|
| `GET /dota2/search?q=` · `GET /dota2/player/:id` · `GET /dota2/heroes` | Búsqueda por nombre, perfil (ID de cuenta o Steam64) y héroes |
| `GET /fortnite/player/:name?platform=epic\|psn\|xbl` | Estadísticas de batalla campal por modo |
| `GET /apex/player/:name?platform=PC\|PS4\|X1` | Rango, leyenda seleccionada, totales y estado |
| `GET /pubg/player/:name?platform=steam\|psn\|xbox\|kakao` | Temporada, clasificatoria y últimas partidas |

Las rutas antiguas sin prefijo (`/account`, `/summoner`, `/ranked`, `/matches`, `/match`) siguen funcionando como alias de `/lol/…`.

## 🗂️ Estructura

```
server/                  backend Express (proxy a Riot, Supercell y las APIs de los demás juegos) + Dockerfile + pruebas
  lib/                   clientes de Riot y Supercell, caché, cola de salida, regiones, errores y middlewares
  routes/                /lol y /tft (fábrica compartida) y /brawlstars, /clashroyale, /clashofclans
src/
  api/                   cliente del backend y Data Dragon
  boot/                  tareas de arranque y progreso de la pantalla de carga
  components/            componentes genéricos (perfil, favoritos, barra flotante…) y ui/
  games/                 un módulo por juego (lol/, tft/, brawlstars/, clashroyale/, clashofclans/, dota2/, fortnite/, apex/, pubg/) + registro
  screens/               Inicio, Favoritos, Ajustes, Perfil, Mi perfil, Carga
  theme/                 colores, tipografía, espaciado y acento por juego
  utils/                 favoritos, recientes, preferencias, formato
assets/                  brand/icon.svg (npm run icons genera los PNG), ranks/ (emblemas) y games/ (íconos de juegos)
docs/                    arquitectura, despliegue, pendientes y capturas
scripts/                 generador de íconos y verificaciones
```

## 🎨 Diseño

Base casi negra con un toque verdoso, superficies en capas y bordes sutiles. Cada juego aporta su acento.

| Token | Color | Uso |
|-------|-------|-----|
| Kairo | ![#35E0A1](https://img.shields.io/badge/-%2335E0A1-35E0A1) | Marca, pantalla de carga |
| LoL | ![#C89B3C](https://img.shields.io/badge/-%23C89B3C-C89B3C) | Acento de League of Legends |
| TFT | ![#0BC4E3](https://img.shields.io/badge/-%230BC4E3-0BC4E3) | Acento de Teamfight Tactics |
| Brawl Stars | ![#FFCE1F](https://img.shields.io/badge/-%23FFCE1F-FFCE1F) | Acento de Brawl Stars |
| Clash Royale | ![#3F8CFF](https://img.shields.io/badge/-%233F8CFF-3F8CFF) | Acento de Clash Royale |
| Clash of Clans | ![#79C942](https://img.shields.io/badge/-%2379C942-79C942) | Acento de Clash of Clans |
| Dota 2 | ![#E4572E](https://img.shields.io/badge/-%23E4572E-E4572E) | Acento de Dota 2 |
| Fortnite | ![#A855F7](https://img.shields.io/badge/-%23A855F7-A855F7) | Acento de Fortnite |
| Apex Legends | ![#E23E57](https://img.shields.io/badge/-%23E23E57-E23E57) | Acento de Apex Legends |
| PUBG | ![#F5A623](https://img.shields.io/badge/-%23F5A623-F5A623) | Acento de PUBG |
| Victoria | ![#4FC97A](https://img.shields.io/badge/-%234FC97A-4FC97A) | Resultado positivo |
| Derrota | ![#E05555](https://img.shields.io/badge/-%23E05555-E05555) | Resultado negativo |

Tipografía: **Sora** para títulos (con `letter-spacing` amplio) e **Inter** para texto. Todo sale de `src/theme/`; `npm run verify` comprueba que cada token exista.

## 🛠️ Scripts

| Comando | Qué hace |
|---------|----------|
| `npx expo start` | Levanta la app (Expo Go / emulador) |
| `npm run verify` | Comprueba imports locales y tokens del tema |
| `npm run icons` | Regenera `icon`, `adaptive-icon`, `splash-icon` y `favicon` desde el SVG |
| `cd server && npm start` | Levanta el backend |

`splash-icon.png` se muestra a 260 dp: si cambias `imageWidth` en `app.json`, cambia también `sizes.splashLogo` en `src/theme/spacing.js`.

## 🌐 Idiomas

Los textos viven en `src/i18n/locales/` (un archivo por idioma, con `es.js` como referencia) y se piden con `t("clave", { variable })`; los plurales usan `clave_one` / `clave_other`. `npm run verify` comprueba que todos los idiomas tengan las mismas claves y variables, que el código no pida claves inexistentes y que no sobren textos.

**Añadir un idioma:** copia `en.js` a `src/i18n/locales/<id>.js` y tradúcelo, impórtalo en `src/i18n/index.js` (añádelo a `LANGUAGES` con su idioma de Data Dragon y su separador de miles y a `DICTS`) y ejecuta `npm run verify`. Los errores del backend llevan un `code` (por ejemplo `PLAYER_NOT_FOUND`) que la app traduce con las claves `errors.*`; el mensaje en español que envía el servidor queda como respaldo.

## ➕ Añadir un juego

1. Crea `src/games/<id>/` con `meta.js` (id, nombre, acento…; los textos van en `src/i18n/locales/`) e `index.js` (`api.search`, `getProfile`, `toFavorite`, `ProfileBody`). Si el juego se busca solo por tag y no tiene regiones, añade `tagSearch: true` y `hasRegion: false` al `meta.js`.
2. Regístralo en `src/games/registry.js` (metadatos) y `src/games/index.js` (módulo completo).
3. Si su API de Riot tiene la misma forma, añade `server/routes/<id>.js` con `createGameRouter` y móntalo en `server/index.js`. Si es de Supercell, añádelo a `GAMES` en `server/lib/supercell.js` y móntalo con `createSupercellRouter`. Para otras APIs de terceros usa `createUpstream` (`server/lib/upstream.js`) como en `server/routes/dota2.js`, y regístrala en `server/lib/extra.js`. Los juegos que se buscan por nombre declaran `search: "name"` (y `platforms`, o `searchResults` si el nombre se repite) en su `meta.js`.

## 🗺️ Roadmap

- [x] LoL y TFT completos, con favoritos, recientes y región
- [x] Sistema de diseño, pantalla de carga animada y micro-interacciones
- [x] Backend con caché y errores en español
- [x] Backend listo para la nube (límite de peticiones, CORS, Docker, `render.yaml`)
- [x] Backend desplegado en la nube (Render) y APK de prueba con EAS
- [ ] Publicar con una *Production API Key* de Riot
- [ ] Valorant (requiere aprobación de Riot)
- [ ] Modo sin conexión con el último perfil visto
- [ ] Notificaciones cuando un favorito cambia de rango
- [x] Cola de salida hacia Riot que respeta el cupo, y juegos no habilitados como "PRONTO"
- [x] Maestría, rotación gratuita y estado del servidor (LoL)
- [x] Brawl Stars, Clash Royale y Clash of Clans (API de Supercell)
- [x] Dota 2, Fortnite, Apex Legends y PUBG (búsqueda por nombre y plataforma)
- [ ] Comparar dos jugadores

La lista completa está en [docs/PENDIENTES.md](docs/PENDIENTES.md).

## 🌐 Página pública y key de Riot

El repo incluye una [página del producto](docs/index.html) y una [política de privacidad](docs/privacy.html) listas para GitHub Pages, y el texto para registrar el producto en el portal de Riot: [docs/RIOT-FORMULARIO.md](docs/RIOT-FORMULARIO.md).

## 🩺 Problemas frecuentes

| Síntoma | Causa y solución |
|---------|------------------|
| "Sin conexión con el servidor" en Inicio | El backend no está corriendo o el celular no lo alcanza. Usa la IP de tu PC en `EXPO_PUBLIC_API_URL`, misma red Wi-Fi, y permite el puerto 3000 en el firewall de Windows |
| "Riot rechazó la consulta: la key no es válida o no tiene acceso a esta API" | La key expiró (las de desarrollo duran 24 h) **o tu producto no tiene habilitada esa API** (por ejemplo TFT). Revisa las APIs de tu app en el Developer Portal; el log del servidor indica cuál falló |
| "Riot limitó las solicitudes" | Superaste el límite de la key. Espera unos segundos: cada perfil hace ~14 peticiones |
| Rango vacío o "Sin clasificar" | El jugador no tiene partidas clasificatorias en ese modo/región. Revisa que la región sea la correcta |
| "Something went wrong" en Expo Go | Expo Go tiene una sesión iniciada y el servidor pide firmar el manifiesto. Arranca con `npm run phone` (usa `--offline`) o cierra la sesión en Expo Go |
| "Supercell rechazó la consulta: la key no es válida o no permite la IP" | La key de Brawl Stars / Clash Royale / Clash of Clans no tiene la IP `45.79.218.79` (la del proxy de RoyaleAPI) o está mal copiada. Las keys no se editan: crea otra con esa IP |
| Fortnite, Apex o PUBG aparecen como "PRONTO" | El servidor no tiene su key (`FORTNITE_API_KEY`, `APEX_API_KEY` o `PUBG_API_KEY`); mira `/health` → `games` |
| "Las estadísticas de esta cuenta son privadas" (Fortnite) | La cuenta tiene las estadísticas en privado en su configuración de Epic; no se pueden ver |
| Un perfil de Dota 2 casi vacío | El jugador no tiene activado "Exponer datos públicos de partidas" en Dota 2 |
| Un juego de Supercell aparece como "PRONTO" o no aparece | El servidor no tiene su key configurada (`/health` → `games`). Ponla en las variables de entorno |
| Íconos de TFT con iniciales | Data Dragon solo trae los sets vigentes; las partidas de sets antiguos usan un placeholder |

## 🤝 Contribuir

Lee [CONTRIBUTING.md](CONTRIBUTING.md). Para vulnerabilidades o keys expuestas, mira [SECURITY.md](SECURITY.md).

## 📄 Licencia

[MIT](LICENSE).

## ⚖️ Aviso legal

Kairo no está respaldada por Riot Games ni refleja las opiniones de Riot Games ni de nadie involucrado oficialmente en la producción o gestión de sus propiedades. Riot Games y todas las propiedades asociadas son marcas comerciales o marcas registradas de Riot Games, Inc.

Dota 2 es marca de Valve Corporation, Fortnite de Epic Games, Apex Legends de Electronic Arts y PUBG de KRAFTON, Inc.; Kairo no está afiliada ni respaldada por ellas.

Este contenido no está afiliado, respaldado, patrocinado ni aprobado específicamente por Supercell y Supercell no se hace responsable de él. Más información: [política de contenido de fans de Supercell](https://supercell.com/en/fan-content-policy/). Brawl Stars, Clash Royale y Clash of Clans son marcas de Supercell.
