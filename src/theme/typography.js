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

export const fontSizes = {
  xxs: 10, xs: 11, sm: 12, md: 13, base: 14,
  lg: 16, xl: 20, xxl: 24, xxxl: 28, hero: 32, icon: 48,
};

export const lineHeights = { small: 15, body: 20, relaxed: 22 };

// letter-spacing
export const tracking = { none: 0, tight: 0.3, wide: 1, wider: 2, widest: 4, brand: 8 };

// Estilos de texto listos para usar con ...type.x
export const type = {
  brand:      { fontFamily: fonts.displayHeavy, fontSize: fontSizes.xxxl, letterSpacing: tracking.widest },
  title:      { fontFamily: fonts.display,      fontSize: fontSizes.xl,   letterSpacing: tracking.wide },
  heading:    { fontFamily: fonts.display,      fontSize: fontSizes.lg,   letterSpacing: tracking.wide },
  stat:       { fontFamily: fonts.displayHeavy, fontSize: fontSizes.xl,   letterSpacing: tracking.tight },
  statLarge:  { fontFamily: fonts.displayHeavy, fontSize: fontSizes.xxl,  letterSpacing: tracking.tight },
  label:      { fontFamily: fonts.displaySemi,  fontSize: fontSizes.xxs,  letterSpacing: tracking.wide },
  body:       { fontFamily: fonts.body,         fontSize: fontSizes.base },
  bodyMedium: { fontFamily: fonts.bodyMedium,   fontSize: fontSizes.md },
  bodyStrong: { fontFamily: fonts.bodyBold,     fontSize: fontSizes.md },
  small:      { fontFamily: fonts.body,         fontSize: fontSizes.sm },
  smallStrong:{ fontFamily: fonts.bodySemi,     fontSize: fontSizes.sm },
  caption:    { fontFamily: fonts.body,         fontSize: fontSizes.xs },
  captionStrong: { fontFamily: fonts.bodyBold,  fontSize: fontSizes.xs },
  micro:      { fontFamily: fonts.bodyMedium,   fontSize: fontSizes.xxs },
};
