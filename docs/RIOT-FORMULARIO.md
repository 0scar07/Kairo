# Formulario de producto de Riot (Developer Portal)

Guía para registrar Kairo en <https://developer.riotgames.com> y pedir una key que no caduque cada 24 h.

> Riot rechaza las solicitudes con descripciones vagas. Cuanto más concreto y **verdadero** sea el texto, mejor. No prometas nada que la app no haga todavía.

## Qué poner en cada campo

| Campo | Qué poner |
|-------|-----------|
| **Nombre del producto** | `Kairo` |
| **Descripción del producto** | El texto de abajo (en inglés: es el idioma del portal y de quienes lo revisan) |
| **Grupo de productos** | Déjalo en tu grupo por defecto (no hace falta crear otro) |
| **URL del producto** | La página pública: `https://0scar07.github.io/Kairo/` (actívala primero; ver "Página pública") |

## Descripción del producto (copiar y pegar)

```
Kairo is a free, ad-free mobile app (React Native / Expo, Android first) that lets League of Legends and Teamfight Tactics players look up public, post-game statistics by Riot ID and region.

What it shows:
- League of Legends: Solo/Duo and Flex rank, recent match history (result, champion, KDA, CS, damage), and a per-match breakdown of all ten players with items, summoner spells and runes; win rate, streaks and most-played champions.
- Teamfight Tactics: Ranked, Double Up and Hyper Roll rank, recent matches with final placement (1-8), active traits and units with star levels; average placement and top-4 rate.
- Favorites and recent searches, stored only on the user's own device.

APIs used: ACCOUNT-V1 (by Riot ID), SUMMONER-V4, LEAGUE-V4 (entries by PUUID), MATCH-V5, TFT-SUMMONER-V1, TFT-LEAGUE-V1 and TFT-MATCH-V1. Static images come from Data Dragon.

How the key is protected: the mobile app never contains the API key. Every request goes through our own backend (Node.js / Express), which holds the key server-side, validates region/PUUID/match-ID inputs, applies per-IP rate limiting, and caches public responses briefly (finished matches 1 hour, account 10 minutes, rank 2 minutes) to minimize calls to the Riot API. When Riot returns HTTP 429 we surface the Retry-After value to the client instead of retrying.

What we do NOT do: we do not use Riot Sign On, collect credentials or personal data, sell or share data, show ads or gambling, or offer any real-time or in-game information; only public data from finished matches is shown. Player names and PUUIDs are masked in our server logs. We do not use Riot logos, and the app and website carry Riot's legal disclaimer.

Status: the app is in active development and being tested with a small group of users; it will be released for free on Google Play. Source code: https://github.com/0scar07/Kairo. Privacy policy: https://0scar07.github.io/Kairo/privacy.html
```

> Antes de enviarlo revisa que cada frase siga siendo cierta. Si cambias algo de la app (por ejemplo, añades anuncios), cambia el texto.

## Qué tipo de key pedir

| Tipo | Cuándo |
|------|--------|
| **Personal** | Un proyecto propio para ti y pocos usuarios. Suele ser lo más rápido para empezar |
| **Producción** | La app pública en Google Play. Riot revisa el producto: pide que sea **funcional y accesible** (por eso conviene tener ya el APK y la página pública) |

Si el portal te da a elegir, empieza por la que encaje con lo que hoy es Kairo: una app en pruebas. Cuando esté publicada, pide la de producción. Los requisitos y plazos los define Riot y cambian: léelos en el portal antes de enviar.

Mientras esperas la aprobación puedes seguir usando la key de desarrollo (24 h).

## Página pública (la "URL del producto")

El repo incluye una página en [`docs/index.html`](index.html) y la política de privacidad en [`docs/privacy.html`](privacy.html). Para publicarlas gratis con GitHub Pages:

1. En GitHub: tu repositorio → **Settings → Pages**.
2. En **Build and deployment**: *Source* = **Deploy from a branch**, *Branch* = `main`, carpeta **`/docs`** → **Save**.
3. Espera 1-2 minutos y abre `https://0scar07.github.io/Kairo/`.

Requiere que el repositorio sea **público** (o un plan que permita Pages en privados). Si vuelves a renombrar el repositorio, cambia el nombre en las URLs de este archivo y de las páginas.

## Lista de comprobación antes de enviar

- [ ] La página pública abre y muestra capturas y la política de privacidad
- [ ] La descripción es verdadera y concreta (APIs usadas, cómo proteges la key)
- [ ] Ningún nombre ni logo de Riot como marca de tu producto ("Kairo" está bien)
- [ ] El aviso legal de Riot aparece en la app y en la página
- [ ] El backend está en línea (ver [DESPLIEGUE.md](DESPLIEGUE.md)) o, al menos, la app se puede probar
