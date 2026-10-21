import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { colors, accents } from "../../theme";

const COUNT = 26;
const DURATION = 1700;
const PALETTE = [accents.lol, colors.gold, colors.win, colors.info, accents.brand, "#FF6B9A"];

// Piezas fijas (siempre las mismas): ángulo, distancia, giro, tamaño y color
const PIECES = Array.from({ length: COUNT }, (_, i) => {
  const a = (-Math.PI / 2) + ((i / COUNT) - 0.5) * Math.PI * 1.25 + Math.sin(i * 12.9898) * 0.18;
  return {
    a, dist: 90 + ((i * 37) % 70), spin: ((i * 53) % 540) - 270,
    w: 5 + (i % 3) * 2, h: 9 + (i % 4) * 2, color: PALETTE[i % PALETTE.length], round: i % 5 === 0,
  };
});

function Piece({ p, piece }) {
  const style = useAnimatedStyle(() => {
    const t = p.value;
    const x = Math.cos(piece.a) * piece.dist * t;
    const y = Math.sin(piece.a) * piece.dist * t + 160 * t * t;   // sale disparada y cae con la gravedad
    return {
      opacity: t === 0 ? 0 : 1 - Math.max(0, (t - 0.65) / 0.35),
      transform: [{ translateX: x }, { translateY: y }, { rotate: `${piece.spin * t}deg` }],
    };
  });
  return <Animated.View style={[styles.piece, { width: piece.w, height: piece.round ? piece.w : piece.h, borderRadius: piece.round ? piece.w : 1.5, backgroundColor: piece.color }, style]} />;
}

/**
 * Lluvia de confeti que sale desde el centro de arriba del contenedor (que debe tener position relative).
 * Cada vez que cambia `fire` (un número mayor que 0) se dispara una vez. Con "Reducir movimiento" no aparece.
 */
export default function Confetti({ fire }) {
  const reduce = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (!fire || reduce) return;
    p.value = 0;
    p.value = withTiming(1, { duration: DURATION, easing: Easing.out(Easing.quad) });
  }, [fire]);
  if (reduce) return null;
  return (
    <View pointerEvents="none" style={styles.origin}>
      {PIECES.map((piece, i) => <Piece key={i} p={p} piece={piece} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  origin: { position: "absolute", top: "35%", left: "50%", width: 0, height: 0, overflow: "visible", zIndex: 5 },
  piece:  { position: "absolute" },
});
