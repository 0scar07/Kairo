<div align="center">

<img src="assets/icon.png" alt="Kairo" width="128" />

# KAIRO

### Every match counts.

[Español](README.md) · **English**

Your stats for **11 games** in one premium mobile app: rank, match history, **live game**, esports, news, clips and widgets.<br />
Free, no accounts, no ads, and the API keys stay on the server, never on your phone.

[![Version](https://img.shields.io/github/v/release/0scar07/Kairo?label=version&color=35E0A1&cacheSeconds=3600)](https://github.com/0scar07/Kairo/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/0scar07/Kairo/total?label=downloads&color=3DDC84&cacheSeconds=3600)](https://github.com/0scar07/Kairo/releases)
[![CI](https://github.com/0scar07/Kairo/actions/workflows/ci.yml/badge.svg)](https://github.com/0scar07/Kairo/actions/workflows/ci.yml)
[![API status](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fstats.uptimerobot.com%2Fapi%2FgetMonitorList%2F3pSwWADClB&query=%24.data%5B0%5D%5B%2730dRatio%27%5D.ratio&suffix=%25&label=API%20%C2%B7%2030%20days&color=35E0A1&cacheSeconds=3600)](https://stats.uptimerobot.com/3pSwWADClB)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/0scar07/Kairo/badge)](https://scorecard.dev/viewer/?uri=github.com/0scar07/Kairo)
[![Last commit](https://img.shields.io/github/last-commit/0scar07/Kairo?label=last%20commit&color=35E0A1)](https://github.com/0scar07/Kairo/commits/main)

![Games](https://img.shields.io/badge/games-11-C89B3C)
![Languages](https://img.shields.io/badge/languages-9-0BC4E3)
![Android](https://img.shields.io/badge/Android-APK-3DDC84?logo=android&logoColor=white)
![iPhone](https://img.shields.io/badge/iPhone-web%20app-000000?logo=apple&logoColor=white)
![Expo SDK](https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react&logoColor=black)
![License](https://img.shields.io/badge/license-MIT-35E0A1)

[Download](#download) · [What's new](#whats-new) · [Features](#features) · [Screenshots](#screenshots) · [Architecture](#architecture) · [Getting started](#getting-started) · [API](#backend-api) · [Roadmap](#roadmap)

<br />

<img src="docs/screenshots/hero.png" alt="Kairo: animated loading screen, home with the free champion rotation, LoL profile with mastery and matches" width="100%" />

<sub>Screenshots rendered in a mobile browser against the real backend. On a phone, the highlights and haptics feel different. The app shown is in Spanish; it speaks 9 languages.</sub>

<br />
<br />

### <img src="docs/icons/demo.svg" width="24" height="24" align="top" />&nbsp;Demo

<a href="https://0scar07.github.io/Kairo/demo/kairo-demo.mp4"><img src="docs/demo/kairo-demo-preview.webp" alt="Kairo in motion: the games, the profile, match details, Explore and the pros" width="100%" /></a>

<sub>The best of the demo, looping and muted. Below is the full 90-second tour with music, or <a href="docs/demo/kairo-demo.mp4">download it</a>.</sub>

<br />

https://github.com/user-attachments/assets/d742c1f1-c26e-4f44-955c-a063e2840adc

</div>

---

## <img src="docs/icons/download.svg" width="30" height="30" align="top" />&nbsp;Download

<div align="center">

<a href="https://github.com/0scar07/Kairo/releases/latest/download/Kairo.apk"><img src="https://img.shields.io/badge/Download-APK-3DDC84?logo=android&logoColor=white&style=for-the-badge" alt="Download APK" height="54" align="middle" /></a>
&nbsp;
<a href="https://apps.obtainium.imranr.dev/redirect?r=obtainium://app/%7B%22id%22%3A%22com.camavingaaa.kairo%22%2C%22url%22%3A%22https%3A%2F%2Fgithub.com%2F0scar07%2FKairo%22%2C%22author%22%3A%220scar07%22%2C%22name%22%3A%22Kairo%22%7D"><img src="docs/badges/obtainium.png" alt="Get it on Obtainium" height="54" align="middle" /></a>

</div>

| Where | How |
|---|---|
| **Android (APK)** | The green button downloads `Kairo.apk` from the latest version ([all versions](https://github.com/0scar07/Kairo/releases)). Android will ask you to allow installing apps from that source. It installs over the previous one without losing anything. |
| **Android (Obtainium)** | Add the repository with the other button and the app updates itself with every new version. |
| **iPhone** | Open <https://0scar07.github.io/Kairo/app/> in Safari → *Share* → *Add to Home Screen*. It works like any other app, with no account or App Store (it is the web version, so some animations may differ). |

> [!TIP]
> Screen and text changes arrive **over the air** when you open the app, no reinstall needed. Only native changes (like the widgets) need a new APK. Everything is in the [CHANGELOG](CHANGELOG.md) (in Spanish).

---

## <img src="docs/icons/new.svg" width="30" height="30" align="top" />&nbsp;What's new

<table>
<tr>
<td width="50%" valign="top">

<img src="docs/icons/goal.svg" width="22" height="22" align="top" /> **Weekly goal (LoL)**<br />
"Climb 50 LP", "Win 5 of 10" or "KDA of 3 or more", with a shining progress bar, the days you played and confetti when you make it.

<img src="docs/icons/week.svg" width="22" height="22" align="top" /> **Your week, Wrapped-style**<br />
A 4-page story (LP, your champion, your best match and the recap) that plays by itself and shares as an image.

<img src="docs/icons/compare.svg" width="22" height="22" align="top" /> **Compare with pros**<br />
Each player over their champion's art, gold vs blue bars, who's ahead and one-tap rivals: Faker and the regional Challenger top 5.

</td>
<td width="50%" valign="top">

<img src="docs/icons/clips.svg" width="22" height="22" align="top" /> **Clips → Following**<br />
Follow up to 12 pros and streamers by their YouTube @ or link and watch their Shorts in the TikTok-style player.

<img src="docs/icons/live.svg" width="22" height="22" align="top" /> **Spectator mode (Valorant)**<br />
The live match refreshes itself every 30 s, the map being played pulses and "Latest" tells you what happened. Follow a team and get a heads-up 15 min before.

<img src="docs/icons/bell.svg" width="22" height="22" align="top" /> **Patch alerts** &nbsp;·&nbsp; <img src="docs/icons/globe.svg" width="22" height="22" align="top" /> **9 languages**<br />
A notification when a patch drops for the games you pick. Now also in Italian, Turkish, Polish and Korean.

</td>
</tr>
</table>

### <img src="docs/icons/widgets.svg" width="24" height="24" align="top" />&nbsp;Home screen widgets (Android)

<div align="center">
<img src="assets/widgets/rank.png" height="150" alt="Rank widget: emblem, LP, this week's gain and the last 5" />
&nbsp;
<img src="assets/widgets/match.png" height="150" alt="Next Valorant match widget" />
&nbsp;
<img src="assets/widgets/friends.png" height="150" alt="Favorites in game widget" />
</div>

Your **Solo/Duo rank** with LP, this week and the last 5; your team's **next Valorant match**; and **which favorites are in game**. Long-press the wallpaper → *Widgets* → *Kairo*. Tapping one opens its screen in the app.

---

## <img src="docs/icons/features.svg" width="30" height="30" align="top" />&nbsp;Features

<table>
<tr>
<td width="33%" valign="top">

#### <img src="docs/icons/stats.svg" width="20" height="20" align="top" />&nbsp;Stats
- Rank with the **official emblem**, LP and win rate
- Match history with filters and **minute-by-minute details**
- **LP progress** for 7 days, 30 days or the season
- **Compare** two players
- **Offline profiles**

</td>
<td width="33%" valign="top">

#### <img src="docs/icons/live.svg" width="20" height="20" align="top" />&nbsp;Live
- LoL **live game** with runes, ranks and bans
- **Notifications** when it starts and ends, with the result
- **Matchups**: build, runes and counters per pairing
- **Pros**: rosters, stats and their next match
- Valorant and Wild Rift esports

</td>
<td width="33%" valign="top">

#### <img src="docs/icons/explore.svg" width="20" height="20" align="top" />&nbsp;Explore
- Netflix-style **news** and in-app patch notes
- TikTok-style **clips** with official Shorts and the channels you follow
- Challenger, GM and Master **leaderboards**
- **Wild Rift** tier list
- Share profiles and stories as images

</td>
</tr>
</table>

### <img src="docs/icons/games.svg" width="24" height="24" align="top" />&nbsp;Games

| Game | Search | What you get |
|---|---|---|
| <img src="docs/games/lol.svg" width="22" height="22" align="top" /> **League of Legends** | Riot ID + region | Rank, history, mastery, rotation, **live game**, LP progress, matchups, pros, weekly goal and Your week |
| <img src="docs/games/tft.svg" width="22" height="22" align="top" /> **Teamfight Tactics** | Riot ID + region | Ranked, Double Up, Hyper Roll, placements and all 8 players with traits and units |
| <img src="docs/games/brawlstars.png" width="22" height="22" align="top" /> **Brawl Stars** | `#TAG` | Trophies, brawlers with power and rank, last 25 battles, records |
| <img src="docs/games/clashroyale.png" width="22" height="22" align="top" /> **Clash Royale** | `#TAG` | Trophies, Path of Legends, current deck with elixir, last 30 battles |
| <img src="docs/games/clashofclans.png" width="22" height="22" align="top" /> **Clash of Clans** | `#TAG` | Town Hall, league, war, donations, heroes and builder base |
| <img src="docs/games/dota2.svg" width="22" height="22" align="top" /> **Dota 2** | Steam name or ID | Official medal, world rank, heroes and last 20 matches |
| <img src="docs/games/fortnite.svg" width="22" height="22" align="top" /> **Fortnite** | Name + platform | Per mode: wins, K/D, top N and hours |
| <img src="docs/games/apex.png" width="22" height="22" align="top" /> **Apex Legends** | Name + platform | Rank with RP, legend with its banner and online status |
| <img src="docs/games/pubg.svg" width="22" height="22" align="top" /> **PUBG** | Name + platform | FPP and TPP, ranked and last 8 matches |
| <img src="docs/games/wildrift.svg" width="22" height="22" align="top" /> **Wild Rift** | — | S+ to D tier list by lane and rank, champion pages and comparer, My mains, risers and fallers |
| <img src="docs/games/valorant.svg" width="22" height="22" align="top" /> **Valorant** | — | Esports: latest champion, live match, schedule, results, tournaments and the teams you follow |

<sub>Wild Rift has no public API and Valorant profiles are waiting for Riot's approval, so those two go straight to what is available.</sub>

<details>
<summary><b>See every feature, game by game</b></summary>

### Riot Games

| | League of Legends | Teamfight Tactics |
|---|---|---|
| **Rank** | Solo/Duo and Flex with the **official emblem**, LP, win rate and tier color; each queue shows its **3 best win-rate champions**. Tapping a queue opens its **LP chart** | Ranked, Double Up and Hyper Roll |
| **History** | Result, champion, queue, KDA, CS and damage (the **last 20** fill in the background); load more and filter by result and champion | Final placement 1–8, queue and duration |
| **Details** | All 10 players with items, **summoner spells and runes**; **gold difference minute by minute** and **item build order** | All 8 players with **traits and starred units** |
| **Summary** | Win rate and KDA **rings**; totals, kill participation, damage, gold, CS and vision per minute; streak, most played champion and **per-champion table** | Average placement, top 4, wins and placement chart |
| **Mastery and rotation** | Top 3 champions, the free rotation and maintenance notices for your region | (n/a) |
| **Live** | The champion's splash art, both teams, spells, runes, each player's rank, bans and timer; a **"How to play against…"** shortcut to your lane opponent | (the API is not enabled yet) |
| **My profile** | Your Riot ID with badges, KDA chart, **weekly goal** and **Your week** | Your Riot ID |

- **Matchups:** pick your champion and your opponent to see the build that wins most against them, the keystone, spells, skill order (first 11 levels), their lane **counters** and the opponent's abilities with cooldowns and damage type. All from Challenger matches, and every figure says how many games back it up.
- **Rank history:** the server takes a daily snapshot of your profile's and your favorites' rank (Riot provides no history, so it fills from the first snapshot).
- **Weekly summary:** on Sunday afternoon, a notification with your games, wins and LP.
- **Pro players:** LCK, LPL, LEC, LCS, LTA North and South, LLA, Worlds and MSI with standings, rosters and each pro's profile per split. **Follow a pro** and get a heads-up 15 minutes before their match.
- **Leaderboard** for Challenger, Grandmaster or Master in your region (Solo/Duo or Flex), and **suggestions** when you have no favorites yet.

LoL and TFT share the **Riot ID** search with a **region** picker (LAN, LAS, NA, BR, EUW, EUNE, TR, KR, JP, OCE) that remembers the last one used.

### Supercell

| | Brawl Stars | Clash Royale | Clash of Clans |
|---|---|---|---|
| **Profile** | Trophies, record, level and club | Trophies, record, level, clan and role | Town Hall, trophies, league and clan |
| **Progress** | 3v3, solo and duo wins; brawlers with power, rank and trophies | Wins, losses, win rate, 3-crown wins and Path of Legends | War, donations, heroes and builder base |
| **Matches** | Last 25 battles with brawler, mode, map and trophies | Last 30 battles with score and trophies; current deck with level and elixir | (the API exposes no battle log) |

Searched by **`#TAG`**, no regions, and you get a notification when a favorite **beats their trophy record**.

### Dota 2, Fortnite, Apex Legends and PUBG

| | Dota 2 | Fortnite | Apex Legends | PUBG |
|---|---|---|---|---|
| **Search** | Steam name (with a list) or ID | Name + Epic, PlayStation, Xbox | Name + PC, PlayStation, Xbox | Name + Steam, PlayStation, Xbox, Kakao |
| **Rank** | **Official medal** with stars and world rank | (none) | Rank with its image, RP and level | Tier, points and K/D |
| **Stats** | Wins, losses, win rate and heroes | Per mode: wins, K/D, top N, hours | Legend with its banner, kills, damage and status | FPP and TPP: wins, K/D, average damage, headshots |
| **Matches** | Last 20 with hero, mode, K/D/A and duration | (stats only) | (stats only) | Last 8 with map, placement, kills and damage |

### Wild Rift and Valorant

| | Wild Rift | Valorant |
|---|---|---|
| **Home** | Official art from the latest patch, tier list, **My mains**, patch top picks, **today's risers and fallers** and patch notes | A different agent every day, the **latest champion** (or the live match), the **countdown** and upcoming tournaments with their prize pool |
| **Tier list / Schedule** | S+ to D tiers by lane and rank (Diamond to Legend); sort by tier, win, pick or ban rate and **share as an image** | Upcoming by day, results and tournaments |
| **Details** | Champion page with win, pick and ban rings and its win rate at every rank | **Spectator mode**: refreshes every 30 s, current map, "Latest" and a **Follow** button per team |
| **Data** | Public stats from the Chinese server (daily) and the official site | PandaScore (`PANDASCORE_TOKEN`, free) |

Wild Rift publishes no builds or counters in any public source, so the app doesn't make them up.

### Across the app

- **Nine languages:** Español, English, Português, Français, Deutsch, Italiano, Türkçe, Polski and 한국어. Picked automatically from the device or by hand in Settings, including champion names (Data Dragon), server errors and number formatting.
- **Notifications** by channel: a favorite's live game, rank changes, records, new patches, Valorant team matches and the weekly summary, with quiet hours. With the app open they show up as a **liquid banner** drawn with Skia.
- **Multi-game:** one module per game; the generic screens know none of them. If the server has no key for a game, it shows as "SOON" instead of erroring.
- **Own design:** an accent per game, logos with their brand gradient, iOS-style **Liquid Glass**, large titles that collapse, profile-shaped loading and **zero emojis** (custom SVG icons).
- **Accessibility:** screen readers, "Reduce motion" and "Reduce transparency".

</details>

---

## <img src="docs/icons/shots.svg" width="30" height="30" align="top" />&nbsp;Screenshots

<table>
  <tr>
    <td align="center"><img src="docs/screenshots/home-lol.png" width="200" /><br /><sub><b>Home and rotation</b></sub></td>
    <td align="center"><img src="docs/screenshots/profile-lol.png" width="200" /><br /><sub><b>LoL profile</b></sub></td>
    <td align="center"><img src="docs/screenshots/live-blue-lol.png" width="200" /><br /><sub><b>Live game</b></sub></td>
    <td align="center"><img src="docs/screenshots/mastery-lol.png" width="200" /><br /><sub><b>Mastery</b></sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/dota2-profile.png" width="200" /><br /><sub><b>Dota 2</b></sub></td>
    <td align="center"><img src="docs/screenshots/brawlstars-profile.png" width="200" /><br /><sub><b>Brawl Stars</b></sub></td>
    <td align="center"><img src="docs/screenshots/clashroyale-profile.png" width="200" /><br /><sub><b>Clash Royale</b></sub></td>
    <td align="center"><img src="docs/screenshots/lol-english.png" width="200" /><br /><sub><b>In English</b></sub></td>
  </tr>
</table>

<details>
<summary><b>See all screenshots</b></summary>

**League of Legends**

<p>
  <img src="docs/screenshots/splash.png" width="170" title="Animated loading" alt="Animated loading" />
  <img src="docs/screenshots/region.png" width="170" title="Region" alt="Region" />
  <img src="docs/screenshots/skeleton.png" width="170" title="Loading" alt="Loading" />
  <img src="docs/screenshots/matches-lol.png" width="170" title="Matches" alt="Matches" />
  <img src="docs/screenshots/match-detail-lol.png" width="170" title="Details with runes" alt="Details with runes" />
  <img src="docs/screenshots/champions-lol.png" width="170" title="Champions" alt="Champions" />
  <img src="docs/screenshots/status-lol.png" width="170" title="Maintenance notice*" alt="Maintenance notice*" />
  <img src="docs/screenshots/rotation-lol.png" width="170" title="Free rotation" alt="Free rotation" />
  <img src="docs/screenshots/live-profile-lol.png" width="170" title="Live game notice" alt="Live game notice" />
  <img src="docs/screenshots/live-red-lol.png" width="170" title="Red team and bans" alt="Red team and bans" />
  <img src="docs/screenshots/matches-flex-lol.png" width="170" title="Flex history" alt="Flex history" />
</p>

**Supercell, Dota 2 and other languages**

<p>
  <img src="docs/screenshots/brawlstars-battles.png" width="170" title="Brawl Stars battles" alt="Brawl Stars battles" />
  <img src="docs/screenshots/clashofclans-profile.png" width="170" title="Clash of Clans" alt="Clash of Clans" />
  <img src="docs/screenshots/clashofclans-heroes.png" width="170" title="Heroes and clan" alt="Heroes and clan" />
  <img src="docs/screenshots/dota2-matches.png" width="170" title="Dota 2 matches" alt="Dota 2 matches" />
  <img src="docs/screenshots/clashroyale-portugues.png" width="170" title="Clash Royale in Português" alt="Clash Royale in Português" />
  <img src="docs/screenshots/settings.png" width="170" title="Settings and languages" alt="Settings and languages" />
</p>

**Teamfight Tactics**

<p>
  <img src="docs/screenshots/home-tft.png" width="170" title="TFT home" alt="TFT home" />
  <img src="docs/screenshots/profile-tft.png" width="170" title="TFT profile" alt="TFT profile" />
  <img src="docs/screenshots/matches-tft.png" width="170" title="Placements and units" alt="Placements and units" />
  <img src="docs/screenshots/match-detail-tft.png" width="170" title="All 8 players" alt="All 8 players" />
</p>

**Favorites and recents**

<p>
  <img src="docs/screenshots/favorite.png" width="170" title="Favorite saved" alt="Favorite saved" />
  <img src="docs/screenshots/favorites.png" width="170" title="Favorites" alt="Favorites" />
  <img src="docs/screenshots/home-recents.png" width="170" title="Recents" alt="Recents" />
</p>

<sub>Real data from each game's API. Fortnite, Apex Legends and PUBG have no screenshot yet. The TFT ones predate the icon redesign. * The maintenance notice was simulated to show the design.</sub>

</details>

---

## <img src="docs/icons/arch.svg" width="30" height="30" align="top" />&nbsp;Architecture

```mermaid
flowchart LR
    App["Kairo app<br/>(Expo · Android · web)"] -- "?region=kr" --> API["Express backend<br/>cache · queue · errors"]
    Widgets["Widgets"] -.-> App
    API -- "X-Riot-Token" --> Riot[["Riot Games API"]]
    API -- "fixed IP" --> SC[["Supercell<br/>BS · CR · CoC"]]
    API --> Others[["OpenDota · Fortnite · Apex · PUBG"]]
    API --> Esports[["lolesports · PandaScore"]]
    API --> Media[["Official news · YouTube"]]
    API -- "watcher" --> Push[["Expo Push"]] --> App
    API --- DB[("Postgres<br/>devices · LP · builds")]
    App -- "icons and static data" --> DD[["Data Dragon"]]
```

- **API keys never ship in the app:** they live only in `server/.env` or the hosting's environment variables.
- **Cache** with request deduplication (finished matches 1 h), an **outgoing queue to Riot** that respects the key's quota, per-IP rate limiting and coded errors the app translates.
- A **watcher** checks favorites every 2 minutes and sends the live game, rank, record and patch notifications.
- The generic screens **know no game**: everything comes from `src/games/`.

More detail, sequence diagrams and decisions in [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) (in Spanish).

### <img src="docs/icons/stack.svg" width="24" height="24" align="top" />&nbsp;Stack

| Layer | Technology |
|------|------------|
| App | React Native 0.86 · Expo SDK 57 · React Navigation 7 · EAS Update (over the air) |
| Animation | Reanimated 4 · Skia · `react-native-svg` · `expo-haptics` |
| Widgets | `react-native-android-widget` |
| Design | Own tokens (`src/theme`) · Sora + Inter |
| Backend | Node 20 · Express 5 · Postgres (Neon) · Docker · Render |
| Data | Riot · Supercell (RoyaleAPI proxy) · OpenDota · Fortnite-API · Apex Legends Status · PUBG · Data Dragon · Brawlify · lolesports.com · PandaScore · Wild Rift (Chinese server) · valorant-api.com · YouTube |
| Notifications | `expo-notifications` + Expo Push (FCM) · Web Push for Kairo Web |

---

## <img src="docs/icons/start.svg" width="30" height="30" align="top" />&nbsp;Getting started

You need **Node 20+** and a key from <https://developer.riotgames.com> (development keys expire every 24 h). The other games' keys are optional: each one turns on when you add its key.

```bash
# 1. Backend
cd server
npm install
cp .env.example .env        # set your RIOT_API_KEY (and the others if you want)
npm start                   # http://localhost:3000 · check /health

# 2. App (in another terminal, from the root)
npm install
npx expo start
```

On a physical device, point the app to your PC's IP (same Wi-Fi):

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.8:3000 npx expo start
```

<details>
<summary><b>Try it on your phone (Expo Go or a test APK)</b></summary>

- **Expo Go** *(fastest)*: scan the QR from `npm run phone` (same as `npx expo start --offline`, which skips the Expo sign-in). Expo Go doesn't show the native splash or the widgets.
- **Test APK with EAS**:
  ```bash
  npm install -g eas-cli
  eas login
  eas build -p android --profile preview
  ```
  Edit `EXPO_PUBLIC_API_URL` in the `preview` profile of [eas.json](eas.json): the APK can only reach a backend your phone can access.

> **HTTP in the APK:** `app.config.js` allows cleartext HTTP only when `EXPO_PUBLIC_API_URL` starts with `http://` (local testing). With an `https://` backend it stays off.

</details>

### <img src="docs/icons/cloud.svg" width="24" height="24" align="top" />&nbsp;Deploy to the cloud

For the app to work **without your PC on**, the backend has to be online. The repo ships [`render.yaml`](render.yaml) and a [`Dockerfile`](server/Dockerfile) (Render, Railway, Fly.io…):

1. **New → Blueprint** on <https://render.com> and pick this repository.
2. Paste your `RIOT_API_KEY` when asked and press **Apply**.
3. Try `https://YOUR-URL.onrender.com/health` and put that URL in `EXPO_PUBLIC_API_URL`.

Favorites and preferences live on the phone; the database (`DATABASE_URL`, e.g. Neon) is only needed for notifications, LP history and builds. Without it the server uses a local file, which Render's free plan wipes on restart.

> [!WARNING]
> Riot development keys **expire after 24 h**: a permanent backend needs a *Personal* or *Production API Key*.

Full guide (free plan sleeping, Railway/Fly, publishing an APK, security): [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md) (in Spanish).

<details>
<summary><b><img src="docs/icons/env.svg" width="22" height="22" align="top" /> Environment variables</b></summary>

`server/.env`

| Variable | Description |
|----------|-------------|
| `RIOT_API_KEY` | Your Riot key. **Required**: the server won't start without it |
| `PORT` | Backend port (default `3000`) |
| `DEFAULT_REGION` | Region when the app sends no `?region=` (default `la1`) |
| `RATE_LIMIT_PER_MIN` | Requests per minute per IP (default `240`) |
| `CORS_ORIGINS` | Allowed web origins, comma-separated (empty = open) |
| `TRUST_PROXY` | Proxies in front of the server (default `1` in production) |
| `RIOT_RATE_LIMITS` | Quota towards Riot, `requests:seconds` (default `18:1,95:120`) |
| `PROBE_RIOT_ID` | Public account used to detect which games the key enables (`Name#TAG@region`) |
| `BRAWLSTARS_API_KEY` · `CLASHROYALE_API_KEY` · `CLASHOFCLANS_API_KEY` | Supercell keys (optional). Allow the IP `45.79.218.79` when creating them |
| `*_API_BASE` | Another base URL for those games (default: RoyaleAPI proxies, which give a fixed IP) |
| `FORTNITE_API_KEY` · `APEX_API_KEY` · `PUBG_API_KEY` | Free keys for Fortnite-API, Apex Legends Status and PUBG (optional) |
| `OPENDOTA_API_KEY` | Optional: Dota 2 works without a key; with one the limits go up |
| `PANDASCORE_TOKEN` | Free [PandaScore](https://pandascore.co) token for Wild Rift and Valorant esports |
| `YOUTUBE_API_KEY` | Optional: YouTube API for Clips and following channels by @ (without it, public feeds are used) |
| `LOLESPORTS_API_KEY` | Optional: lolesports.com key (default: the public one their site uses) |
| `DATABASE_URL` | Postgres for devices, LP history and builds (without it, a local JSON file) |
| `WATCHER_ENABLED` · `WATCH_INTERVAL_MS` · `WATCH_MAX_PER_TICK` | Watcher: on (yes), how often it checks (`120000` ms) and players per round (`40`) |
| `BUILDS_ENABLED` | `false` turns off Challenger build collection (handy locally) |
| `MAX_DEVICES` | Cap on registered devices for notifications (default `5000`) |
| `EXPO_ACCESS_TOKEN` | Optional: Expo token if you enable push security |
| `WEBPUSH_PUBLIC_KEY` · `WEBPUSH_PRIVATE_KEY` · `WEBPUSH_SUBJECT` | Optional: Kairo Web notifications (`npx web-push generate-vapid-keys`) |
| `ART_SECRET` · `PUBLIC_BASE_URL` | Optional: signing and public URL for notification images |

App: `EXPO_PUBLIC_API_URL` is the backend URL (default `http://192.168.1.8:3000`).

</details>

---

## <img src="docs/icons/api.svg" width="30" height="30" align="top" />&nbsp;Backend API

Every Riot route accepts `?region=la1 · la2 · na1 · br1 · euw1 · eun1 · tr1 · kr · jp1 · oc1 …`. Routes that return text accept `?lang=` or `?hl=` with the language.

<details>
<summary><b>League of Legends and TFT</b></summary>

| Route | Description |
|------|-------------|
| `GET /health` | Status, regions, Riot queue and **which games the key enables** (`games`) |
| `GET /{lol\|tft}/account/:gameName/:tagLine` | Riot account (PUUID) |
| `GET /{lol\|tft}/summoner/:puuid` | Summoner profile (icon, level) |
| `GET /{lol\|tft}/ranked/:puuid` | Player ranks |
| `GET /{lol\|tft}/matches/:puuid?start=0&count=10` | Match IDs (max 20 per page) |
| `GET /{lol\|tft}/match/:matchId` | Match details |
| `GET /lol/mastery/:puuid?count=3` | Mastery: top champions and total score |
| `GET /lol/rotation` | Weekly free rotation |
| `GET /lol/status` | Region maintenance and incidents |
| `GET /lol/live/:puuid` | Current game with each player's rank (`{ inGame: false }` if not playing) |
| `GET /lol/live/:puuid/insights` | Each player's mastery on the champion they're playing |
| `GET /lol/match/:matchId/timeline` | Gold, XP and CS per minute, objectives and item order |
| `GET /lol/history/:puuid` · `POST /lol/history/touch` | Daily rank history (30 days) |
| `GET /lol/builds` · `GET /lol/builds/:championId` | Challenger builds for the patch |
| `GET /lol/builds/matchups?position=` · `/:championId/opponents` · `/:championId/vs/:enemyId` | Matchups: pairings by lane, frequent opponents and a pairing's summary |
| `GET /lol/leaderboard?region=&tier=&queue=&start=&limit=` | Paginated Challenger, Grandmaster or Master (max 50; `X-Total-Count`). Also used by [Kairo Web](https://github.com/0scar07/kairo-web) |

The old unprefixed routes (`/account`, `/summoner`, `/ranked`, `/matches`, `/match`) still work as aliases of `/lol/…`.

</details>

<details>
<summary><b>LoL esports</b></summary>

| Route | Description |
|---|---|
| `GET /esports/leagues` | LCK, LPL, LEC, LCS, LTA North and South, LLA, Worlds and MSI |
| `GET /esports/leagues/:slug?tournamentId=` | The league's tournaments and the selected one's standings |
| `GET /esports/teams/:slug` | Team with its roster |
| `GET /esports/teams/:slug/stats?tournamentId=` | Each player's stats in the tournament |
| `GET /esports/teams/:slug/next` | The team's next official match |

</details>

<details>
<summary><b>Supercell, Dota 2, Fortnite, Apex and PUBG</b></summary>

| Route | Description |
|------|-------------|
| `GET /{brawlstars, clashroyale, clashofclans}/player/:tag` | Player profile (tag with or without `#`) |
| `GET /{brawlstars, clashroyale}/battles/:tag` | Latest battles (`{ items }`) |
| `GET /{brawlstars, clashroyale, clashofclans}/top?limit=10` | World's best players |
| `GET /brawlstars/club/:tag` · `/brawlers` · `/events` | Club, brawlers and active events |
| `GET /dota2/search?q=` · `/player/:id` · `/heroes` · `/match/:id` · `/items` · `/herostats` | Search, profile, heroes, matches and items |
| `GET /fortnite/player/:name?platform=epic\|psn\|xbl` | Stats per mode |
| `GET /apex/player/:name?platform=PC\|PS4\|X1` | Rank, legend, totals and status |
| `GET /pubg/player/:name?platform=steam\|psn\|xbox\|kakao` | Season, ranked and latest matches |

</details>

<details>
<summary><b>Wild Rift, Valorant, News and Clips</b></summary>

| Route | Description |
|------|-------------|
| `GET /wildrift/meta?rank=diamond\|master\|challenger\|legend` | Tier list by lane for the chosen rank |
| `GET /wildrift/champion/:heroId` | A champion at every rank and lane |
| `GET /wildrift/news?lang=` | Official site updates (patch notes carry `patch: true`) |
| `GET /wildrift/esports` · `GET /valorant/esports` | Live, upcoming, results and tournaments |
| `GET /valorant/match/:id` | Match details (refreshed every 20 s while live) |
| `GET /news?lang=es\|en\|pt\|fr\|de\|it\|tr\|pl\|ko` | Latest from LoL, TFT, Valorant, Wild Rift, Dota 2, Apex, PUBG and Fortnite |
| `GET /news/article?game=lol\|tft\|valorant\|wildrift&path=` | A Riot article (patch notes) as sections, champions and changes |
| `GET /clips` | Shorts from each game's official YouTube channels |
| `GET /clips/channel?c=` | Find a channel by @, link or ID (by @ needs `YOUTUBE_API_KEY`) |
| `GET /clips/suggested` | Suggested pros and streamers to follow |
| `GET /clips/following?c=UC…,UC…&g=lol,…` | Shorts from the channels you follow (up to 12) |

</details>

<details>
<summary><b>Notifications and sync</b></summary>

No accounts: each phone registers with its token and its own secret.

| Route | Description |
|------|-------------|
| `POST /devices` · `GET /devices/me` · `PUT /devices/me/{favorites, settings, token, webpush}` · `POST /devices/me/test` · `DELETE /devices/me` | Registration, watched favorites, alert settings (including patches per game), test and removal |
| `POST /sync` · `GET /sync/:code` · `PUT /sync/:code` | Kairo Web favorites synced with a private code |
| `GET /art/banner.png` | Notification image (only server-signed URLs) |

</details>

---

## <img src="docs/icons/dev.svg" width="30" height="30" align="top" />&nbsp;For developers

### Structure

```
index.js                 entry: registers the widgets and the app
server/                  Express backend + Dockerfile + tests (node --test)
  lib/                   API clients, cache, queue, watcher, trackers (rank, trophies, patches) and push
  routes/                one route per game, builds, esports, news, clips, devices and sync
src/
  games/                 one module per game (lol/, tft/, valorant/, wildrift/…) + registry
  screens/               Home, Favorites, Settings, Profile, My profile, Search, Loading
  components/            generic components and ui/ (Glass, Sheet, Confetti…)
  news/ · clips/         News PRO and TikTok-style Clips
  notifications/         game, patch and team alerts, and where tapping them leads
  widget/                Android widgets and their data
  i18n/                  the 9 languages
  api/ · boot/ · share/ · theme/ · utils/ · navigation/
assets/                  icon (brand/icon.svg), rank emblems, games, sounds and widget previews
docs/                    architecture, deployment, to-do, screenshots, demo and the public page
scripts/                 icon generator and checks
```

### Scripts

| Command | What it does |
|---------|----------|
| `npx expo start` | Starts the app (Expo Go / emulator) |
| `npm run phone` | Same, without the Expo sign-in |
| `npm run web` | The app in the browser |
| `npm run verify` | Checks imports, theme tokens and that all 9 languages have the same keys and variables |
| `npm run icons` | Regenerates `icon`, `adaptive-icon`, `splash-icon` and `favicon` from the SVG |
| `cd server && npm start` | Starts the backend |
| `cd server && npm test` | Backend tests |

### Design

A near-black base with a hint of green, layered surfaces and subtle borders; each game brings its accent. **Sora** for titles and **Inter** for text. Everything comes from `src/theme/` and `npm run verify` checks every token exists.

<p>
<img src="https://img.shields.io/badge/Kairo-35E0A1?style=flat-square" />
<img src="https://img.shields.io/badge/LoL-C89B3C?style=flat-square" />
<img src="https://img.shields.io/badge/TFT-0BC4E3?style=flat-square" />
<img src="https://img.shields.io/badge/Brawl%20Stars-FFCE1F?style=flat-square" />
<img src="https://img.shields.io/badge/Clash%20Royale-3F8CFF?style=flat-square" />
<img src="https://img.shields.io/badge/Clash%20of%20Clans-79C942?style=flat-square" />
<img src="https://img.shields.io/badge/Dota%202-E4572E?style=flat-square" />
<img src="https://img.shields.io/badge/Fortnite-A855F7?style=flat-square" />
<img src="https://img.shields.io/badge/Apex-E23E57?style=flat-square" />
<img src="https://img.shields.io/badge/PUBG-F5A623?style=flat-square" />
<img src="https://img.shields.io/badge/Wild%20Rift-4FC3F7?style=flat-square" />
<img src="https://img.shields.io/badge/Valorant-FF4655?style=flat-square" />
<img src="https://img.shields.io/badge/Win-4FC97A?style=flat-square" />
<img src="https://img.shields.io/badge/Loss-E05555?style=flat-square" />
</p>

<details>
<summary><b>Add a language</b></summary>

Strings live in `src/i18n/locales/` (one file per language, with `es.js` as the reference) and are requested with `t("key", { variable })`; plurals use `key_one` / `key_other`.

1. Copy `en.js` to `src/i18n/locales/<id>.js` and translate it.
2. Import it in `src/i18n/index.js`: add it to `LANGUAGES` (with its Data Dragon locale and thousands separator) and to `DICTS`.
3. Run `npm run verify`.

Backend errors carry a `code` (e.g. `PLAYER_NOT_FOUND`) that the app translates with the `errors.*` keys.

</details>

<details>
<summary><b>Add a game</b></summary>

1. Create `src/games/<id>/` with `meta.js` (id, name, accent…) and `index.js` (`api.search`, `getProfile`, `toFavorite`, `ProfileBody`). If it is searched by tag only and has no regions, add `tagSearch: true` and `hasRegion: false`.
2. Register it in `src/games/registry.js` (metadata) and `src/games/index.js` (full module).
3. On the server:
   - Riot API with the same shape → `server/routes/<id>.js` with `createGameRouter`.
   - Supercell → add it to `GAMES` in `server/lib/supercell.js` and mount it with `createSupercellRouter`.
   - Another API → `createUpstream` (`server/lib/upstream.js`) as in `server/routes/dota2.js`, and register it in `server/lib/extra.js`.
4. Games searched by name declare `search: "name"` (and `platforms` or `searchResults`). Games without profiles (Wild Rift, Valorant) declare `browseOnly: true` and show only their `HomeExtras`.

</details>

<details>
<summary><b><img src="docs/icons/help.svg" width="22" height="22" align="top" /> Troubleshooting</b></summary>

| Symptom | Cause and fix |
|---------|------------------|
| "No connection to the server" | The backend isn't running or the phone can't reach it. Use your PC's IP in `EXPO_PUBLIC_API_URL`, same Wi-Fi, and allow port 3000 in the firewall |
| "Riot rejected the request: the key is invalid…" | The key expired (development keys last 24 h) **or your product doesn't have that API enabled** (e.g. TFT). The server log says which one failed |
| "Riot rate-limited the requests" | You hit the key's limit. Wait a few seconds: each profile makes ~14 requests |
| Empty rank or "Unranked" | The player has no ranked games in that mode/region |
| "Something went wrong" in Expo Go | Expo Go is signed in. Start with `npm run phone` or sign out |
| "Supercell rejected the request…" | The key doesn't allow the IP `45.79.218.79` (RoyaleAPI proxy). Keys can't be edited: create another with that IP |
| A game shows as "SOON" | The server has no key for it; check `/health` → `games` |
| "This account's stats are private" (Fortnite) | The account has them set to private in its Epic settings |
| A nearly empty Dota 2 profile | The player hasn't enabled "Expose Public Match Data" |
| I can't find the widgets | They need the v1.5.0 APK with widgets (they don't arrive over the air or in Expo Go). Reinstall from [Releases](https://github.com/0scar07/Kairo/releases/latest) |
| TFT icons with initials | Data Dragon only ships the current sets |

</details>

---

## <img src="docs/icons/roadmap.svg" width="30" height="30" align="top" />&nbsp;Roadmap

- [x] Full LoL and TFT, with favorites, recents and regions
- [x] Cloud backend with cache, Riot queue and translated errors
- [x] Brawl Stars, Clash Royale, Clash of Clans, Dota 2, Fortnite, Apex Legends and PUBG
- [x] Live game and favorites notifications
- [x] Offline mode, share as image and over-the-air updates
- [x] Compare, leaderboard, pros and LP progress
- [x] Matchups with Challenger builds and counters
- [x] Wild Rift (tier list and champions) and Valorant esports
- [x] News, patch notes and TikTok-style Clips
- [x] Weekly goal, Your week and Valorant spectator mode
- [x] Android widgets and 9 languages
- [ ] Ship with a Riot *Production API Key*
- [ ] Valorant profiles (needs Riot's approval)

The full list is in [docs/PENDIENTES.md](docs/PENDIENTES.md), and everything already shipped, version by version, in the [CHANGELOG](CHANGELOG.md) (both in Spanish).

---

## <img src="docs/icons/star.svg" width="30" height="30" align="top" />&nbsp;Support it

If Kairo is useful to you, a star helps more people find it (and helps it get into the Obtainium catalog).

<a href="https://star-history.com/#0scar07/Kairo&Date"><picture><source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=0scar07/kairo&type=Date&theme=dark" /><img src="https://api.star-history.com/svg?repos=0scar07/kairo&type=Date" alt="Kairo stars over time" width="600" /></picture></a>

- **Contributing:** read [CONTRIBUTING.md](CONTRIBUTING.md) and the [code of conduct](CODE_OF_CONDUCT.md).
- **Security:** for vulnerabilities or exposed keys, see [SECURITY.md](SECURITY.md).
- **Public page:** [product](docs/en.html) and [privacy](docs/privacy.html).
- **License:** [MIT](LICENSE).

## <img src="docs/icons/legal.svg" width="30" height="30" align="top" />&nbsp;Legal

Kairo isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.

Dota 2 is a trademark of Valve Corporation, Fortnite of Epic Games, Apex Legends of Electronic Arts and PUBG of KRAFTON, Inc.; Kairo is not affiliated with or endorsed by them.

This material is unofficial and is not endorsed by Supercell. For more information see Supercell's [Fan Content Policy](https://supercell.com/en/fan-content-policy/). Brawl Stars, Clash Royale and Clash of Clans are trademarks of Supercell.
