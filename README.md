# Kairo

*Cada partida cuenta.*

App móvil (React Native + Expo SDK 54) para ver estadísticas de jugadores con la API de Riot: League of Legends, TFT y Valorant.

La API key de Riot **nunca** va en la app: vive solo en `server/.env` y todas las llamadas pasan por el backend.

## Puesta en marcha

### 1. Backend (`server/`)

```bash
cd server
npm install
cp .env.example .env     # y pon tu RIOT_API_KEY (https://developer.riotgames.com)
npm start                # http://localhost:3000  (comprueba /health)
```

### 2. App

```bash
npm install
npx expo start
```

En un dispositivo físico, apunta la app a la IP de tu PC con la variable `EXPO_PUBLIC_API_URL`
(por ejemplo `EXPO_PUBLIC_API_URL=http://192.168.1.8:3000`) o edita `API_BASE` en `src/constants/config.js`.

Las keys de desarrollo de Riot caducan cada 24 h: regénerala y actualiza `server/.env`.

## Estructura

- `server/` — backend Express (proxy a Riot, guarda la key)
- `src/api/` — llamadas al backend y a Data Dragon
- `src/components/` — componentes reutilizables
- `src/screens/` — pantallas
- `src/theme/` — sistema de diseño (colores, tipografía, espaciado)
- `src/constants/config.js` — configuración y constantes
- `assets/brand/icon.svg` — ícono original; `npm run icons` genera los PNG
