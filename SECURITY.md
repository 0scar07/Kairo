# Seguridad

## API keys

La key de Riot **nunca** debe estar en la app ni en el repositorio: vive solo en `server/.env`, que git ignora.

Si ves una key en el código o en el historial:

1. **Regénerala** en <https://developer.riotgames.com> (la anterior deja de valer).
2. Actualiza `server/.env`.
3. Avisa al mantenedor para limpiar el historial si hace falta.

> Nota: una key que estuvo en un commit público sigue visible en el historial aunque se borre después. Por eso regenerarla es lo que la neutraliza.

## Reportar una vulnerabilidad

No abras un *issue* público. Escribe al mantenedor por mensaje privado en GitHub con una descripción y pasos para reproducirla.

## Backend

- Valida región, PUUID e ID de partida antes de llamar a Riot.
- Limita `count` a 20 por petición.
- Incluye límite de peticiones por IP (`RATE_LIMIT_PER_MIN`), CORS configurable (`CORS_ORIGINS`), cabeceras de seguridad y registro con IDs enmascarados.
- Al desplegar: usa HTTPS, guarda la key solo en las variables del hosting y sigue [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md).
