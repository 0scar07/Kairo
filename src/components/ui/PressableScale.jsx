import React from "react";
import { Pressable } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { tap } from "../../utils/haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SPRING = { damping: 16, stiffness: 320, mass: 0.6 };

// Pulsable con escala sutil al presionar (y háptica ligera opcional)
export default function PressableScale({
  onPress, onLongPress, onPressIn, onPressOut, scaleTo = 0.97, haptic = false, disabled, style, children,
  accessibilityRole = onPress ? "button" : undefined, accessibilityState, ...rest
}) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...rest}
      accessibilityRole={accessibilityRole}
      accessibilityState={disabled ? { ...accessibilityState, disabled: true } : accessibilityState}
      disabled={disabled}
      onPressIn={e => { scale.value = withSpring(scaleTo, SPRING); onPressIn?.(e); }}
      onPressOut={e => { scale.value = withSpring(1, SPRING); onPressOut?.(e); }}
      onPress={onPress ? () => { if (haptic) tap(); onPress(); } : undefined}
      onLongPress={onLongPress}
      style={[animated, style]}
    >
      {children}
    </AnimatedPressable>
  );
}
