import React, { useEffect, useState } from "react";
import { AccessibilityInfo, Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { colors, withAlpha } from "../../theme";

/**
 * Material de cristal para la capa flotante (barras, hojas, avisos), nunca para el contenido.
 *  - iOS y web: desenfoque real del contenido que pasa por debajo.
 *  - Android: superficie translúcida sin desenfoque (la propia guía de Apple lo recomienda allí:
 *    el blur en Android es costoso e inconsistente entre versiones).
 *  - "Reducir transparencia" activado: superficie opaca.
 * Encima, el mismo acabado en todas: los cantos del cristal iluminados desde arriba (ver GLASS_RIM). No hay refracción
 * real: es una ilusión de grosor hecha con luces y sombras interiores.
 */
// Canto especular como el de iOS: una línea de luz de 1 px que entra en diagonal, más viva arriba a la izquierda y
// devuelta, más tenue, abajo a la derecha, con un brillo difuso apenas visible bajo el canto superior. Sombras
// interiores (Android 10+, iOS y web; en Android 9 o anterior se ignoran y queda el cristal liso).
const BLACK = "#000000";
export const GLASS_RIM = [
  `inset 1px 1px 0 ${withAlpha(colors.text, 0.2)}`,
  `inset -1px -1px 0 ${withAlpha(colors.text, 0.08)}`,
  `inset 0 18px 22px -20px ${withAlpha(colors.text, 0.1)}`,
].join(", ");
// Separación del fondo para lo que flota: una sombra amplia y suave más otra corta de contacto. Es exterior, así que
// no se dibuja bajo el cristal (`elevation` en Android sí lo hacía y lo ensuciaba)
// (negro puro: una sombra del color del fondo no se vería sobre el fondo)
export const GLASS_LIFT = { boxShadow: `0 8px 24px ${withAlpha(BLACK, 0.32)}, 0 1px 3px ${withAlpha(BLACK, 0.25)}` };
// Contorno exterior finísimo: recorta el cristal contra fondos claros y sirve de borde donde no hay sombras interiores
export const GLASS_EDGE = withAlpha(colors.text, 0.06);

// fill: opacidad del tinte oscuro sobre el desenfoque (más alto = más legible sobre contenido cargado)
// rim: los cantos iluminados (false en superficies que no flotan, como la barra de título compacta)
export default function Glass({ style, children, intensity = 60, fill = 0.35, rim = true, opaque = withAlpha(colors.surfaceRaised, 0.98), ...rest }) {
  const reduce = useReduceTransparency();
  const edge = rim ? <Rim style={style} /> : null;

  if (reduce) return <View style={[style, { backgroundColor: opaque }]} {...rest}>{children}{edge}</View>;
  if (Platform.OS === "android") {
    return <View style={[style, { backgroundColor: withAlpha(colors.surfaceRaised, 0.92) }]} {...rest}>{children}{edge}</View>;
  }
  return (
    <BlurView
      intensity={intensity}
      tint={Platform.OS === "ios" ? "systemChromeMaterialDark" : "dark"}
      style={[style, { overflow: "hidden", backgroundColor: withAlpha(colors.bg, fill) }]}
      {...rest}
    >
      {children}
      {edge}
    </BlurView>
  );
}

// Los cantos van en una capa propia encima: en iOS el desenfoque es una vista hija del BlurView y taparía una sombra
// interior puesta en él. Copia los radios del cristal para que la luz siga sus esquinas.
const RADII = ["borderRadius", "borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", "borderBottomRightRadius"];
function Rim({ style }) {
  const flat = StyleSheet.flatten(style) || {};
  const radii = {};
  for (const k of RADII) if (flat[k] != null) radii[k] = flat[k];
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, radii, { boxShadow: GLASS_RIM }]} />;
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
