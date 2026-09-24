import React, { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

/**
 * Expansión animada (altura + opacidad). El contenido se monta la primera vez que se abre
 * y se mide para animar hasta su altura real; si su tamaño cambia estando abierto, se ajusta.
 */
export default function Expandable({ open, children, duration = 260 }) {
  const [mounted, setMounted] = useState(open);
  const [measured, setMeasured] = useState(0);
  const height = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => { if (open) setMounted(true); }, [open]);

  useEffect(() => {
    const easing = Easing.out(Easing.cubic);
    if (open && measured > 0) {
      height.value = withTiming(measured, { duration, easing });
      opacity.value = withTiming(1, { duration, easing });
    } else if (!open) {
      height.value = withTiming(0, { duration: duration - 60, easing });
      opacity.value = withTiming(0, { duration: duration - 60, easing });
    }
  }, [open, measured]);

  const animated = useAnimatedStyle(() => ({ height: height.value, opacity: opacity.value }));

  if (!mounted) return null;
  return (
    <Animated.View style={[{ overflow: "hidden" }, animated]}>
      {/* Se mide fuera del flujo para conocer la altura natural del contenido */}
      <View
        style={{ position: "absolute", top: 0, left: 0, right: 0 }}
        onLayout={e => setMeasured(Math.ceil(e.nativeEvent.layout.height))}
      >
        {children}
      </View>
    </Animated.View>
  );
}
