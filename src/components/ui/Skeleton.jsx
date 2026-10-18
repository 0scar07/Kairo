import React, { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { colors, radii } from "../../theme";

// Bloque gris con un brillo que lo recorre mientras carga el contenido real.
// Con "Reducir movimiento" el brillo se queda quieto (Reanimated no reproduce el bucle).
export default function Skeleton({ width = "100%", height, radius = radii.md, style }) {
  const [w, setW] = useState(0);
  const x = useSharedValue(0);

  useEffect(() => {
    if (!w) return;
    x.value = -w;
    x.value = withRepeat(withTiming(w, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, false);
  }, [w]);

  const sheen = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const band = Math.max(w * 0.6, 60);

  return (
    <View
      onLayout={e => setW(e.nativeEvent.layout.width)}
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.surfaceHigh, overflow: "hidden" }, style]}
    >
      {w > 0 && (
        <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, bottom: 0, left: (w - band) / 2, width: band }, sheen]}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="kairoSheen" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
                <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.13" />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#kairoSheen)" />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}
