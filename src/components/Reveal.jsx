import React, { useEffect } from "react";
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming,
} from "react-native-reanimated";

export const REVEAL_STEP_MS = 80;

/**
 * Aparición escalonada: fade + desplazamiento hacia arriba.
 * Cada sección se retrasa `order * 80 ms`; `baseDelay` sirve para esperar a que termine
 * otra animación (ej. el fade-out de la pantalla de carga).
 */
export default function Reveal({
  order = 0, baseDelay = 0, step = REVEAL_STEP_MS, distance = 16, duration = 450, style, children,
}) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withDelay(baseDelay + order * step, withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
  }, []);

  const animated = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: (1 - p.value) * distance }],
  }));

  return <Animated.View style={[animated, style]}>{children}</Animated.View>;
}
