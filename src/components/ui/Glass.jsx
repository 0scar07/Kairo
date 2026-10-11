import React, { useEffect, useState } from "react";
import { AccessibilityInfo, Platform, View } from "react-native";
import { BlurView } from "expo-blur";
import { colors, withAlpha } from "../../theme";

/**
 * Material de cristal para la capa flotante (barras, hojas, avisos), nunca para el contenido.
 *  - iOS y web: desenfoque real del contenido que pasa por debajo.
 *  - Android: superficie translúcida sin desenfoque (la propia guía de Apple lo recomienda allí:
 *    el blur en Android es costoso e inconsistente entre versiones).
 *  - "Reducir transparencia" activado: superficie opaca.
 */
// fill: opacidad del tinte oscuro sobre el desenfoque (más alto = más legible sobre contenido cargado)
export default function Glass({ style, children, intensity = 60, fill = 0.35, opaque = withAlpha(colors.surfaceRaised, 0.98), ...rest }) {
  const reduce = useReduceTransparency();

  if (reduce) return <View style={[style, { backgroundColor: opaque }]} {...rest}>{children}</View>;
  if (Platform.OS === "android") {
    return <View style={[style, { backgroundColor: withAlpha(colors.surfaceRaised, 0.94) }]} {...rest}>{children}</View>;
  }
  return (
    <BlurView
      intensity={intensity}
      tint={Platform.OS === "ios" ? "systemChromeMaterialDark" : "dark"}
      style={[style, { overflow: "hidden", backgroundColor: withAlpha(colors.bg, fill) }]}
      {...rest}
    >
      {children}
    </BlurView>
  );
}

export function useReduceTransparency() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceTransparencyEnabled?.()
      .then(v => { if (alive) setReduce(!!v); })
      .catch(() => { /* sin soporte en esta plataforma */ });
    const sub = AccessibilityInfo.addEventListener?.("reduceTransparencyChanged", v => setReduce(!!v));
    return () => { alive = false; sub?.remove?.(); };
  }, []);
  return reduce;
}
