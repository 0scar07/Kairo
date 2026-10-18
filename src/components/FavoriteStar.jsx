import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import Icon from "./Icon";
import { colors, radii, sizes } from "../theme";

const SPARKS = [0, 60, 120, 180, 240, 300];

// Estrella de favorito: al marcarla da un salto y suelta un anillo y seis chispas doradas (solo al pasar a favorito).
// Con "Reducir movimiento" no hay nada que se mueva: en su lugar la estrella suelta un brillo dorado que aparece y se apaga.
export default function FavoriteStar({ active, size = sizes.avatarSm }) {
  const scale = useSharedValue(1);
  const ring = useSharedValue(0);
  const glow = useSharedValue(0);
  const reduce = useReducedMotion();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }   // sin animación al abrir el perfil
    if (active && reduce) {
      glow.value = withSequence(
        withTiming(1, { duration: 150, reduceMotion: ReduceMotion.Never }),
        withTiming(0, { duration: 450, reduceMotion: ReduceMotion.Never }),
      );
    } else if (active) {
      scale.value = withSequence(withSpring(1.35, { damping: 8, stiffness: 420 }), withSpring(1, { damping: 12, stiffness: 260 }));
      ring.value = 0;
      ring.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    } else {
      scale.value = withSequence(withTiming(0.8, { duration: 90 }), withSpring(1));
    }
  }, [active]);

  const starStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value * 0.45 }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ring.value === 0 ? 0 : 1 - ring.value,
    transform: [{ scale: 0.6 + ring.value * 1.2 }],
  }));

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Animated.View pointerEvents="none" style={[styles.glow, { width: size * 1.6, height: size * 1.6 }, glowStyle]} />
      <Animated.View pointerEvents="none" style={[styles.ring, { width: size, height: size }, ringStyle]} />
      {SPARKS.map(deg => <Spark key={deg} deg={deg} size={size} progress={ring} />)}
      <Animated.View style={starStyle}>
        <Icon name="star" size={size} color={active ? colors.gold : colors.textMuted} filled={active} />
      </Animated.View>
    </View>
  );
}

function Spark({ deg, size, progress }) {
  const rad = (deg * Math.PI) / 180;
  const style = useAnimatedStyle(() => {
    const d = size * (0.35 + progress.value * 0.55);
    return {
      opacity: progress.value === 0 || progress.value === 1 ? 0 : 1 - progress.value,
      transform: [{ translateX: Math.cos(rad) * d }, { translateY: Math.sin(rad) * d }, { scale: 1 - progress.value * 0.5 }],
    };
  });
  return <Animated.View pointerEvents="none" style={[styles.spark, style]} />;
}

const styles = StyleSheet.create({
  glow:  { position: "absolute", borderRadius: radii.pill, backgroundColor: colors.gold },
  spark: { position: "absolute", width: sizes.dot, height: sizes.dot, borderRadius: radii.pill, backgroundColor: colors.gold },
  ring: { position: "absolute", borderRadius: radii.pill, borderWidth: sizes.borderThick, borderColor: colors.gold },
});
