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

const testText = locale => ({ title: tr(locale).testTitle, body: tr(locale).testBody });

module.exports = { LOCALES, queueName, startText, endText, testText };
