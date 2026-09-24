import { GAME_META } from "../games/registry";

// Paleta de Kairo: base casi negra con un toque verdoso, superficies en capas y bordes sutiles.
export const colors = {
  bg:            "#070C0F",
  surface:       "#0D141B",   // tarjetas
  surfaceRaised: "#131C26",   // elementos sobre tarjetas, tabs activos
  surfaceHigh:   "#1B2734",   // pistas de barras, placeholders
  border:        "#1C2733",
  borderStrong:  "#2B3A4B",

  text:          "#E6EDF6",
  textSecondary: "#9AAABD",
  textMuted:     "#66778B",
  textFaint:     "#3E4C5E",

  // Resultado de la partida
  win:           "#4FC97A",
  loss:          "#E05555",
  winBg:         "#0A1F14",
  winBgStrong:   "#0D2A1A",
  lossBg:        "#1F0A0A",
  lossBgStrong:  "#2A0D0D",
  gold:          "#F1C40F",   // KDA perfecto, victorias destacadas
  orange:        "#FF6B35",
  info:          "#0BC4E3",

  onAccent:      "#070C0F",   // texto sobre un botón de color de acento
  overlay:       "#000000AA",

  // Costo de las unidades de TFT (1 a 5)
  cost: { 1: "#8A97A8", 2: "#3FBF6B", 3: "#3A8DFF", 4: "#B45CFF", 5: "#FFC533" },

  placement: { first: "#FFD700", second: "#C0C0C0", third: "#CD7F32" },
  rank:      ["#FFD700", "#C0C0C0", "#CD7F32"],

  tier: {
    IRON: "#8A8A8A", BRONZE: "#CD7F32", SILVER: "#A8A9AD",
    GOLD: "#FFD700", PLATINUM: "#00D4AA", EMERALD: "#50C878",
    DIAMOND: "#B9F2FF", MASTER: "#9B59B6", GRANDMASTER: "#E74C3C",
    CHALLENGER: "#F1C40F",
  },
};

// Cada juego declara su acento en src/games/<juego>/meta.js; "brand" es el de Kairo
export const accents = {
  brand: "#35E0A1",
  ...Object.fromEntries(GAME_META.map(g => [g.id, g.accent])),
};

// "#RRGGBB" + opacidad (0-1) -> "#RRGGBBAA"
export function withAlpha(hex, alpha) {
  const a = Math.round(Math.min(Math.max(alpha, 0), 1) * 255).toString(16).padStart(2, "0");
  return `${hex}${a}`;
}

// Resplandor para texto (las sombras de vista dibujan un recuadro alrededor del texto)
export const textGlow = (color, radius = 14) => ({
  textShadowColor: color,
  textShadowRadius: radius,
  textShadowOffset: { width: 0, height: 0 },
});

// Mezcla dos colores "#RRGGBB" (t de 0 a 1)
export function mixHex(a, b, t) {
  const ch = (hex, i) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return "#" + [0, 1, 2]
    .map(i => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t).toString(16).padStart(2, "0"))
    .join("");
}

// Semáforo de porcentaje de victorias
export function winrateColor(wr, accent) {
  if (wr >= 55) return colors.win;
  if (wr >= 50) return accent;
  return colors.loss;
}

// Color de un KDA ("Perfect" o número)
export function kdaColor(kda, neutral = colors.textSecondary) {
  if (kda === "Perfect") return colors.gold;
  return parseFloat(kda) >= 3 ? colors.win : neutral;
}
