# Contribuir a Kairo

¡Gracias por querer ayudar! Esta guía es corta a propósito.

## Preparar el entorno

Sigue "Puesta en marcha" del [README](README.md): backend en `server/` (con tu propia `RIOT_API_KEY`) y app con `npx expo start`.

## Antes de abrir un PR

```bash
npm run verify        # imports locales, tokens del tema y las mismas claves en los cinco idiomas
(cd server && npm test)   # pruebas del backend, si tocaste server/
npx expo export --platform android --output-dir /tmp/kairo-export   # el bundle debe compilar
```

## Reglas del proyecto

- **Nunca subas una API key.** Solo va en `server/.env` (ignorado por git). Si se te escapa una, regénerala en developer.riotgames.com.
- **La app no llama a Riot**: todo pasa por `server/`.
- **Textos en los cinco idiomas:** nada de texto suelto en las pantallas; cada texto es una clave en `src/i18n/locales/` (con `es.js` como referencia) y lleva su traducción en `en`, `pt`, `fr` y `de`.
- **Sin valores sueltos**: colores, tamaños, espaciados y fuentes salen de `src/theme/`.
- **Las pantallas genéricas no conocen ningún juego**: lo específico de cada juego va en `src/games/<id>/`.
- **No silencies errores**: muéstralos al usuario o regístralos con `console.warn`.

## Commits

Mensajes claros y con prefijo: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.

## Añadir un juego

Mira "Añadir un juego" en el [README](README.md#-añadir-un-juego) y el contrato de módulos en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md#módulos-de-juego).

## Reportar un problema

Abre un *issue* con la plantilla correspondiente e incluye pasos para reproducirlo. Para vulnerabilidades, mira [SECURITY.md](SECURITY.md).

## Convivencia

Al participar aceptas el [código de conducta](CODE_OF_CONDUCT.md).
