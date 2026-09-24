# Kairo

*Cada partida cuenta.*

App móvil (React Native + Expo SDK 54) para consultar estadísticas de jugadores con la API de Riot Games.

| Juego | Estado |
|-------|--------|
| League of Legends | ✅ Perfil, rango Solo/Dúo y Flex, historial con detalle (objetos, hechizos, runas), campeones, racha |
| Teamfight Tactics | ✅ Rango (Ranked, Double Up, Hyper Roll), historial con posición 1–8, rasgos y unidades con estrellas |
| Valorant | ⏳ Próximamente: su API de partidas requiere una *production key* aprobada por Riot |

Además: favoritos y búsquedas recientes, selector de región, "Mi perfil" por juego, barra de navegación flotante, animaciones y háptica.

> **La API key de Riot nunca va en la app.** Vive solo en `server/.env` y todas las llamadas a Riot pasan por el backend.

## Puesta en marcha

Necesitas Node 20+ y una key de <https://developer.riotgames.com> (las de desarrollo caducan cada 24 h: regénerala y actualiza `server/.env`).

### 1. Backend (`server/`)

```bash
cd server
npm install
cp .env.example .env     # y pon tu RIOT_API_KEY
npm start                # http://localhost:3000
```

Variables de `server/.env`:

| Variable | Descripción |
|----------|-------------|
| `RIOT_API_KEY` | Tu key de Riot (obligatoria: si falta, el servidor no arranca) |
| `PORT` | Puerto (por defecto 3000) |
| `DEFAULT_REGION` | Región si la app no envía `?region=` (por defecto `la1`) |

Rutas (todas aceptan `?region=la1|la2|na1|br1|euw1|eun1|tr1|kr|jp1|oc1…`):

- `GET /health`
- `GET /{lol|tft}/account/:gameName/:tagLine`
- `GET /{lol|tft}/summoner/:puuid`, `/ranked/:puuid`
- `GET /{lol|tft}/matches/:puuid?start=0&count=10` (máx. 20) y `/match/:matchId`

Las rutas antiguas sin prefijo (`/account`, `/summoner`, `/ranked`, `/matches`, `/match`) siguen funcionando como alias de `/lol/…` y avisan en consola.
El backend cachea en memoria (partidas terminadas 1 h, cuenta 10 min, rango 2 min) y traduce los errores de Riot a mensajes en español (key inválida, límite de peticiones, jugador inexistente…).

### 2. App

```bash
npm install
npx expo start
```

La app necesita saber dónde está el backend. En un dispositivo físico usa la IP de tu PC en la misma red Wi-Fi:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.8:3000 npx expo start
```

(o cambia el valor por defecto de `API_BASE` en `src/constants/config.js`).

## Probarla en el celular

- **Expo Go** (lo más rápido): escanea el QR de `npx expo start`. Ojo: en Expo Go no se ve el splash nativo personalizado.
- **APK de prueba con EAS**:
  ```bash
  npm install -g eas-cli
  eas login
  eas init            # el proyecto cambió de slug (ggtracker → kairo); vuelve a enlazarlo
  eas build -p android --profile preview
  ```
  Edita `EXPO_PUBLIC_API_URL` en el perfil `preview` de `eas.json`: el APK solo puede llegar a un backend accesible desde el celular (tu IP local o uno desplegado).

> **HTTP en el APK:** `app.json` habilita `usesCleartextTraffic` para poder hablar con un backend de pruebas por `http://`. Al publicar, usa un backend con HTTPS y quita esa opción.

## Íconos

El ícono original está en `assets/brand/icon.svg`. Para regenerar los PNG (`icon`, `adaptive-icon`, `splash-icon`, `favicon`):

```bash
npm run icons
```

`splash-icon.png` se muestra a 260 dp: si cambias `imageWidth` en `app.json` (plugin `expo-splash-screen`), cambia también `sizes.splashLogo` en `src/theme/spacing.js`.

## Estructura

```
server/                 backend Express (proxy a Riot)
  lib/                  cliente de Riot, caché, regiones, errores
  routes/               /lol y /tft (fábrica compartida)
src/
  api/                  cliente del backend y Data Dragon
  boot/                 tareas de arranque y progreso de la pantalla de carga
  components/           componentes genéricos (perfil, favoritos, barra flotante…) y ui/
  games/                un módulo por juego (lol/, tft/) + registro
  screens/              Home, Favoritos, Ajustes, Perfil, Mi perfil, Carga
  theme/                colores, tipografía, espaciado y acento por juego
  utils/                favoritos, recientes, preferencias, formato
```

### Añadir un juego

1. Crea `src/games/<id>/` con `meta.js` (id, nombre, acento, ícono…) e `index.js` (API, `getProfile`, `toFavorite`, `ProfileBody`).
2. Regístralo en `src/games/registry.js` (metadatos) y `src/games/index.js` (módulo completo).
3. Si su API de Riot tiene la misma forma, añade `server/routes/<id>.js` con `createGameRouter` y móntalo en `server/index.js`.

Las pantallas genéricas no conocen ningún juego: leen todo del registro.

## Aviso legal

Kairo no está respaldada por Riot Games ni refleja las opiniones de Riot Games ni de nadie involucrado oficialmente en la producción o gestión de sus propiedades. Riot Games y todas las propiedades asociadas son marcas comerciales o marcas registradas de Riot Games, Inc.
