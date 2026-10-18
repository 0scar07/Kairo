import React from "react";
import { StyleSheet } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { CHIP_H, CHIP_W, chipScale, chipTop } from "./geometry";

/**
 * Fondo del banner en la web: vidrio oscuro con desenfoque CSS, sin efecto líquido. Skia en web necesita descargar un
 * motor aparte (CanvasKit), demasiado peso para un adorno; en móvil se usa GlassBackdrop.native.jsx.
 */
export default function GlassBackdrop({ geo, width }) {
  const { pw, ph, py, chip, alpha } = geo;

  const capsule = useAnimatedStyle(() => ({
    left: (width - pw.value) / 2, top: py.value, width: pw.value, height: ph.value, borderRadius: ph.value / 2, opacity: alpha.value,
  }));
  const chipStyle = useAnimatedStyle(() => {
    const s = chipScale(chip.value);
    return {
      left: (width - CHIP_W * s) / 2, top: chipTop(py.value, ph.value, chip.value), width: CHIP_W * s, height: CHIP_H * s,
      borderRadius: (CHIP_H * s) / 2, opacity: Math.min(1, chip.value * 2) * alpha.value,
    };
  });

  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.glass, capsule]} />
      <Animated.View pointerEvents="none" style={[styles.glass, chipStyle]} />
    </>
  );
}

const styles = StyleSheet.create({
  glass: {
    position: "absolute",
    backgroundColor: "rgba(14, 23, 30, 0.82)",
    borderWidth: 1,
    borderColor: "rgba(230, 237, 246, 0.06)",
    backdropFilter: "blur(18px) saturate(1.3)",
    // Mismo acabado que el resto del cristal (ver GLASS_RIM y GLASS_LIFT en ui/Glass.jsx)
    boxShadow: "inset 1px 1px 0 rgba(230, 237, 246, 0.2), inset -1px -1px 0 rgba(230, 237, 246, 0.08), inset 0 18px 22px -20px rgba(230, 237, 246, 0.1), 0 8px 24px rgba(0, 0, 0, 0.32), 0 1px 3px rgba(0, 0, 0, 0.25)",
  },
});
