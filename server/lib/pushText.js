// Textos de las notificaciones en los idiomas de la app. Sin emojis: solo texto. Idioma por defecto: español.
const LOCALES = ["es", "en", "pt", "fr", "de"];

const QUEUES = {
  400: "Normal Draft", 420: "Ranked Solo/Duo", 430: "Normal Blind", 440: "Ranked Flex", 450: "ARAM",
  480: "Swiftplay", 490: "Normal", 700: "Clash", 900: "URF", 1020: "One for All", 1700: "Arena", 1900: "URF",
};
const GENERIC = { es: "Partida", en: "Game", pt: "Partida", fr: "Partie", de: "Spiel" };
const queueName = (queueId, locale) => QUEUES[queueId] || GENERIC[locale] || GENERIC.es;

const T = {
  es: {
    live: n => `${n} está en partida`, ago: m => `hace ${m} min`,
    won: (n, c) => (c ? `${n} ganó con ${c}` : `${n} ganó su partida`),
    lost: (n, c) => (c ? `${n} perdió con ${c}` : `${n} perdió su partida`),
    testTitle: "Notificación de prueba", testBody: "Kairo te avisará cuando tus favoritos entren en partida.",
  },
  en: {
    live: n => `${n} is in a game`, ago: m => `${m} min ago`,
    won: (n, c) => (c ? `${n} won with ${c}` : `${n} won their game`),
    lost: (n, c) => (c ? `${n} lost with ${c}` : `${n} lost their game`),
    testTitle: "Test notification", testBody: "Kairo will let you know when your favorites start a game.",
  },
  pt: {
    live: n => `${n} está em partida`, ago: m => `há ${m} min`,
    won: (n, c) => (c ? `${n} venceu com ${c}` : `${n} venceu a partida`),
    lost: (n, c) => (c ? `${n} perdeu com ${c}` : `${n} perdeu a partida`),
    testTitle: "Notificação de teste", testBody: "O Kairo avisará quando seus favoritos entrarem em partida.",
  },
  fr: {
    live: n => `${n} est en partie`, ago: m => `il y a ${m} min`,
    won: (n, c) => (c ? `${n} a gagné avec ${c}` : `${n} a gagné sa partie`),
    lost: (n, c) => (c ? `${n} a perdu avec ${c}` : `${n} a perdu sa partie`),
    testTitle: "Notification de test", testBody: "Kairo vous prévient quand vos favoris lancent une partie.",
  },
  de: {
    live: n => `${n} ist im Spiel`, ago: m => `vor ${m} Min.`,
    won: (n, c) => (c ? `${n} hat mit ${c} gewonnen` : `${n} hat das Spiel gewonnen`),
    lost: (n, c) => (c ? `${n} hat mit ${c} verloren` : `${n} hat das Spiel verloren`),
    testTitle: "Testbenachrichtigung", testBody: "Kairo benachrichtigt dich, wenn deine Favoriten ein Spiel starten.",
  },
};
const tr = locale => T[locale] || T.es;

// "Ranked Solo/Duo · Ahri · hace 4 min" (el tiempo solo si ya lleva un rato)
function startText(locale, { name, queueId, champion, minutes }) {
  const t = tr(locale);
  const parts = [queueName(queueId, locale)];
  if (champion) parts.push(champion);
  if (minutes >= 2) parts.push(t.ago(minutes));
  return { title: t.live(name), body: parts.join(" · ") };
}

// "Faker ganó con Ahri" / "8/2/11 · Ranked Solo/Duo"
function endText(locale, { name, win, champion, kills, deaths, assists, queueId }) {
  const t = tr(locale);
  return {
    title: (win ? t.won : t.lost)(name, champion),
    body: `${kills}/${deaths}/${assists} · ${queueName(queueId, locale)}`,
  };
}

// Etiquetas de la imagen ancha (banner) de la notificación
const ART = {
  es: { live: "EN VIVO", victory: "VICTORIA", defeat: "DERROTA", inGame: "En partida ahora" },
  en: { live: "LIVE", victory: "VICTORY", defeat: "DEFEAT", inGame: "In game now" },
  pt: { live: "AO VIVO", victory: "VITÓRIA", defeat: "DERROTA", inGame: "Em partida agora" },
  fr: { live: "EN DIRECT", victory: "VICTOIRE", defeat: "DÉFAITE", inGame: "En partie maintenant" },
  de: { live: "LIVE", victory: "SIEG", defeat: "NIEDERLAGE", inGame: "Gerade im Spiel" },
};
const artText = locale => ART[locale] || ART.es;

// ---- Resumen semanal y cambios de rango
const TIER_NAMES = {
  es: ["Hierro", "Bronce", "Plata", "Oro", "Platino", "Esmeralda", "Diamante", "Maestro", "Gran Maestro", "Retador"],
  en: ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Emerald", "Diamond", "Master", "Grandmaster", "Challenger"],
  pt: ["Ferro", "Bronze", "Prata", "Ouro", "Platina", "Esmeralda", "Diamante", "Mestre", "Grão-Mestre", "Desafiante"],
  fr: ["Fer", "Bronze", "Argent", "Or", "Platine", "Émeraude", "Diamant", "Maître", "Grand Maître", "Challenger"],
  de: ["Eisen", "Bronze", "Silber", "Gold", "Platin", "Smaragd", "Diamant", "Meister", "Großmeister", "Herausforderer"],
};
const TIER_ORDER = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
const tierLabel = (locale, tier, rank) => {
  const name = (TIER_NAMES[locale] || TIER_NAMES.es)[TIER_ORDER.indexOf(tier)] || tier;
  return TIER_ORDER.indexOf(tier) >= 7 ? name : `${name} ${rank}`;   // desde Maestro no hay divisiones
};

const WEEKLY = {
  es: { title: "Resumen semanal", games: n => `${n} partidas`, wins: p => `${p} % victorias`, more: n => `(+${n} más)` },
  en: { title: "Weekly summary", games: n => `${n} games`, wins: p => `${p}% wins`, more: n => `(+${n} more)` },
  pt: { title: "Resumo semanal", games: n => `${n} partidas`, wins: p => `${p} % de vitórias`, more: n => `(+${n} mais)` },
  fr: { title: "Résumé de la semaine", games: n => `${n} parties`, wins: p => `${p} % de victoires`, more: n => `(+${n} de plus)` },
  de: { title: "Wochenübersicht", games: n => `${n} Spiele`, wins: p => `${p} % Siege`, more: n => `(+${n} weitere)` },
};

// "Faker: +45 LP · 12 partidas · 58 % victorias" (con el más destacado y cuántos más hay)
function weeklyText(locale, { name, lp, games, winrate, extra }) {
  const w = WEEKLY[locale] || WEEKLY.es;
  const sign = lp > 0 ? `+${lp}` : String(lp);
  const body = `${name}: ${sign} LP · ${w.games(games)} · ${w.wins(winrate)}${extra > 0 ? ` ${w.more(extra)}` : ""}`;
  return { title: w.title, body };
}

const RANK = {
  es: { up: n => `${n} subió de rango`, down: n => `${n} bajó de rango`, promo: n => `${n} está en promoción`, now: r => `Ahora es ${r}`, series: r => `Serie de ascenso en ${r}` },
  en: { up: n => `${n} ranked up`, down: n => `${n} dropped a rank`, promo: n => `${n} is in promotion`, now: r => `Now ${r}`, series: r => `Promotion series in ${r}` },
  pt: { up: n => `${n} subiu de elo`, down: n => `${n} caiu de elo`, promo: n => `${n} está em promoção`, now: r => `Agora é ${r}`, series: r => `Série de promoção em ${r}` },
  fr: { up: n => `${n} a gagné un rang`, down: n => `${n} a perdu un rang`, promo: n => `${n} est en promotion`, now: r => `Maintenant ${r}`, series: r => `Série de promotion en ${r}` },
  de: { up: n => `${n} ist aufgestiegen`, down: n => `${n} ist abgestiegen`, promo: n => `${n} ist in der Beförderung`, now: r => `Jetzt ${r}`, series: r => `Beförderungsserie in ${r}` },
};

function rankChangeText(locale, { name, kind, tier, rank }) {
  const t = RANK[locale] || RANK.es;
  const label = tierLabel(locale, tier, rank);
  return { title: t[kind](name), body: kind === "promo" ? t.series(label) : t.now(label) };
}

const testText = locale => ({ title: tr(locale).testTitle, body: tr(locale).testBody });

module.exports = { LOCALES, queueName, startText, endText, testText, artText, weeklyText, rankChangeText, tierLabel };
