import React, { useEffect } from "react";
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming,
} from "react-native-reanimated";
import { colors, radii } from "../../theme";

// Bloque gris que "respira" mientras carga el contenido real
export default function Skeleton({ width = "100%", height, radius = radii.md, style }) {
  const p = useSharedValue(0.45);

  useEffect(() => {
    p.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.45, { duration: 800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, []);

  const animated = useAnimatedStyle(() => ({ opacity: p.value }));
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: colors.surfaceHigh }, animated, style]} />;
}
