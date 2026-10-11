import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import Icon from "./Icon";
import { colors, radii, sizes } from "../theme";

// Estrella de favorito: al marcarla da un salto y suelta un anillo dorado (solo al pasar a favorito)
export default function FavoriteStar({ active, size = sizes.avatarSm }) {
  const scale = useSharedValue(1);
  const ring = useSharedValue(0);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }   // sin animación al abrir el perfil
    if (active) {
      scale.value = withSequence(withSpring(1.35, { damping: 8, stiffness: 420 }), withSpring(1, { damping: 12, stiffness: 260 }));
      ring.value = 0;
      ring.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    } else {
      scale.value = withSequence(withTiming(0.8, { duration: 90 }), withSpring(1));
    }
  }, [active]);

  const starStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ring.value === 0 ? 0 : 1 - ring.value,
    transform: [{ scale: 0.6 + ring.value * 1.2 }],
  }));

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Animated.View pointerEvents="none" style={[styles.ring, { width: size, height: size }, ringStyle]} />
      <Animated.View style={starStyle}>
        <Icon name="star" size={size} color={active ? colors.gold : colors.textMuted} filled={active} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { position: "absolute", borderRadius: radii.pill, borderWidth: sizes.borderThick, borderColor: colors.gold },
});
