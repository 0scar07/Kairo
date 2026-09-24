import React from "react";
import { Pressable } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { tap } from "../../utils/haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SPRING = { damping: 16, stiffness: 320, mass: 0.6 };

// Pulsable con escala sutil al presionar (y háptica ligera opcional)
export default function PressableScale({
  onPress, onLongPress, scaleTo = 0.97, haptic = false, disabled, style, children, ...rest
}) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={() => { scale.value = withSpring(scaleTo, SPRING); }}
      onPressOut={() => { scale.value = withSpring(1, SPRING); }}
      onPress={onPress ? () => { if (haptic) tap(); onPress(); } : undefined}
      onLongPress={onLongPress}
      style={[animated, style]}
    >
      {children}
    </AnimatedPressable>
  );
}
