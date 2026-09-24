# Arquitectura

Kairo tiene dos piezas: una **app** (React Native + Expo) y un **backend** (Express) que hace de proxy a la API de Riot. La key de Riot vive solo en el backend.

```mermaid
flowchart LR
    subgraph Movil["📱 App Kairo (Expo)"]
        UI["Pantallas genéricas<br/>Home · Favoritos · Ajustes · Perfil"]
        GM["Módulos de juego<br/>lol/ · tft/"]
        UI --> GM
    end

    subgraph Servidor["🖥️ Backend (Express)"]
        R["Routers /lol y /tft"]
        C[("Caché en memoria<br/>TTL + dedupe")]
        E["Errores en español"]
        R --> C
        R --> E
    end

    RIOT[["Riot Games API"]]
    DD[["Data Dragon (CDN)<br/>íconos, campeones, runas, TFT"]]

    GM -- "?region=kr" --> R
    C -- "X-Riot-Token" --> RIOT
    GM -- "imágenes y datos estáticos" --> DD
```

## Flujo de un perfil

```mermaid
sequenceDiagram
    participant U as Usuario
    participant A as App
    participant B as Backend
    participant R as Riot API
    U->>A: Busca "Nombre#TAG" (región KR)
    A->>A: Abre el perfil con un skeleton animado
    A->>B: GET /lol/account/Nombre/TAG?region=kr
    B->>R: account-v1 (por Riot ID)
    R-->>B: puuid
    par invocador
        A->>B: /summoner/:puuid
    and rango
        A->>B: /ranked/:puuid
    and partidas
        A->>B: /matches/:puuid?count=10
    end
    B-->>A: datos (desde caché si los tiene)
    A->>B: /match/:id × 10
    B-->>A: partidas (cachean 1 h: no cambian)
    A-->>U: Perfil, rangos, resumen y partidas
```

Si el rango falla, el perfil se muestra igual con un aviso; si falla el resto, se muestra un error con botón de reintentar.

## Arranque de la app

`useBoot` ejecuta las tareas en paralelo y expone un progreso **real** que alimenta la pantalla de carga (mínimo ~1,8 s):

| Tarea | Qué hace |
|-------|----------|
| `fonts` | Carga Sora e Inter |
| `dataDragon` | Lee la versión vigente y la lista de campeones (con respaldo en AsyncStorage) |
| `favorites` | Migra claves antiguas y favoritos sin `gameId`/región |
| `prefs` | Último juego, región y vibración |
| `recents` | Búsquedas recientes |
| `server` | Ping a `/health`. Si falla, no bloquea: Home muestra un aviso |

Cada tarea tiene un límite de 6 s y un valor por defecto si falla.

## Módulos de juego

Las pantallas genéricas **no conocen ningún juego**: leen todo de `src/games/`.

```
src/games/
  registry.js      metadatos de todos los juegos (sin dependencias; el tema lo usa para el acento)
  index.js         módulos completos + getGame() + juegos "próximamente"
  lol/  tft/       un módulo por juego
    meta.js        id, nombre, acento, ícono, placeholder, available
    index.js       api.search, getProfile, toFavorite, ProfileBody
```

Contrato de un módulo:

| Campo | Descripción |
|-------|-------------|
| `id`, `name`, `short`, `icon`, `accent` | Identidad del juego (vienen de `meta.js`) |
| `api.search(gameName, tagLine, region)` | Devuelve `{ account, summoner, ranked, rankedError, matches, hasMore, nextStart, region }` |
| `getProfile(data)` | `{ avatar, name, tag, subtitle, ranked }` para la cabecera |
| `toFavorite(data)` | Lo que se guarda al marcar favorito |
| `ProfileBody({ data, setData, setError, mine })` | Contenido propio del juego |

## Backend

```
server/
  index.js          arranque, /health, montaje de routers y alias antiguos
  lib/regions.js    región → clúster de Riot (americas, europe, asia, sea)
  lib/cache.js      caché con TTL, límite de entradas y dedupe de peticiones en curso
  lib/riot.js       cliente de Riot, HttpError, errores en español, manejador central
  routes/           gameRouter.js (fábrica) + lol.js + tft.js
```

| Dato | Caché |
|------|-------|
| Partida terminada | 1 h (no cambia) |
| Cuenta | 10 min |
| Invocador | 5 min |
| Rango | 2 min |
| Lista de IDs de partidas | 1 min |

| Error de Riot | Respuesta del backend |
|---------------|-----------------------|
| 404 | 404 con mensaje del recurso ("Jugador no encontrado") |
| 401 / 403 | 503 "el servidor no tiene acceso a Riot" (key inválida o vencida) |
| 429 | 429 con `Retry-After` |
| Timeout | 504 |

## Sistema de diseño

Todos los colores, tamaños, espaciados y tipografías salen de `src/theme/` (no hay valores sueltos en los componentes; `npm run verify` comprueba que cada token exista).

- **Base**: casi negra con un toque verdoso (`#070C0F`), superficies en capas y bordes sutiles.
- **Acento por juego**: menta para Kairo, dorado para LoL, cian para TFT. Al cambiar de juego el acento se interpola durante 350 ms.
- **Tipografía**: Sora (títulos, con `letter-spacing` amplio) e Inter (texto).
- **Resultado**: verde/rojo para victoria/derrota; el color del rango tiñe tarjetas y resplandores.

## Decisiones

- **Valorant no está implementado**: su API de partidas requiere una *production key* aprobada por Riot.
- **El rango se pide por PUUID** (`league-v4/entries/by-puuid`): Riot ya no devuelve `id` en `summoner-v4`.
- **Los datos de TFT vienen de Data Dragon** por versión y se guardan compactos en AsyncStorage. Data Dragon solo trae los sets vigentes: las unidades de sets antiguos usan un placeholder con su nombre.
- **El detalle de partida se expande con animación** midiendo su altura real (`Expandable`), sin alturas fijas.
