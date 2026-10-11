import {
  Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold,
} from "@expo-google-fonts/sora";
import {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
} from "@expo-google-fonts/inter";

// Fuentes a cargar al arrancar (Sora para títulos, Inter para texto)
export const fontAssets = {
  Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold,
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
};

export const fonts = {
  display:      "Sora_700Bold",
  displayHeavy: "Sora_800ExtraBold",
  displaySemi:  "Sora_600SemiBold",
  body:         "Inter_400Regular",
  bodyMedium:   "Inter_500Medium",
  bodySemi:     "Inter_600SemiBold",
  bodyBold:     "Inter_700Bold",
};

// Escala basada en las guías de Apple: 11 pt es el mínimo absoluto (solo datos densos: badges,
// marcadores dentro de filas de partidas) y el texto de lectura parte de 16.
export const fontSizes = {
  xxs: 11, xs: 12, sm: 13, md: 14, base: 16,
  lg: 17, xl: 20, xxl: 24, xxxl: 28, hero: 34, icon: 48,
};

export const lineHeights = { small: 16, body: 22, relaxed: 24 };

// letter-spacing: los títulos van compactos; el espaciado amplio queda para el logotipo
export const tracking = { tighter: -0.6, tight: -0.2, none: 0, wide: 0.3, wider: 0.6, widest: 2, brand: 6 };

// Estilos de texto listos para usar con ...type.x
export const type = {
  brand:      { fontFamily: fonts.displayHeavy, fontSize: fontSizes.xxxl, letterSpacing: tracking.widest },
  largeTitle: { fontFamily: fonts.display,      fontSize: fontSizes.hero, letterSpacing: tracking.tighter },
  title:      { fontFamily: fonts.display,      fontSize: fontSizes.xl,   letterSpacing: tracking.tight },
  heading:    { fontFamily: fonts.display,      fontSize: fontSizes.lg,   letterSpacing: tracking.tight },
  stat:       { fontFamily: fonts.displayHeavy, fontSize: fontSizes.xl,   letterSpacing: tracking.tight },
  statLarge:  { fontFamily: fonts.displayHeavy, fontSize: fontSizes.xxl,  letterSpacing: tracking.tight },
  label:      { fontFamily: fonts.bodySemi,     fontSize: fontSizes.xs,   letterSpacing: tracking.none },
  section:    { fontFamily: fonts.bodySemi,     fontSize: fontSizes.md },
  body:       { fontFamily: fonts.body,         fontSize: fontSizes.base },
  bodyMedium: { fontFamily: fonts.bodyMedium,   fontSize: fontSizes.md },
  bodyStrong: { fontFamily: fonts.bodyBold,     fontSize: fontSizes.md },
  small:      { fontFamily: fonts.body,         fontSize: fontSizes.sm },
  smallStrong:{ fontFamily: fonts.bodySemi,     fontSize: fontSizes.sm },
  caption:    { fontFamily: fonts.body,         fontSize: fontSizes.xs },
  captionStrong: { fontFamily: fonts.bodyBold,  fontSize: fontSizes.xs },
  micro:      { fontFamily: fonts.bodyMedium,   fontSize: fontSizes.xxs },
};
