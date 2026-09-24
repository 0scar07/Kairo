# Backend de Kairo

Proxy Express a la API de Riot. Guarda la API key (nunca va en la app), cachea las respuestas y traduce los errores a mensajes en español.

```bash
npm install
cp .env.example .env     # pon tu RIOT_API_KEY
npm start                # http://localhost:3000
```

- Rutas y ejemplos: [README principal](../README.md#-api-del-backend)
- Diseño interno (caché, errores, regiones): [docs/ARQUITECTURA.md](../docs/ARQUITECTURA.md#backend)

```
index.js          arranque, /health, routers y alias antiguos
lib/regions.js    región → clúster de Riot
lib/cache.js      caché con TTL y dedupe de peticiones
lib/riot.js       cliente de Riot, HttpError y manejador de errores
routes/           gameRouter.js (fábrica) + lol.js + tft.js
```
