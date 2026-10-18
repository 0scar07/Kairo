import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import Glass, { GLASS_EDGE, GLASS_LIFT } from "./Glass";
import Icon from "../Icon";
import { colors, radii, sizes, spacing, type } from "../../theme";

// Aviso breve al estilo de Apple (como "Añadido a la biblioteca"): aparece en el centro, confirma y se va.
// Uso: showHud("Añadido a favoritos") desde cualquier parte; <HudHost /> se monta una vez en App.
let emit = null;
export function showHud(text, icon = "check") {
  if (emit) emit({ text, icon, key: Date.now() });
  AccessibilityInfo.announceForAccessibility?.(text);
}

export function HudHost() {
  const [item, setItem] = useState(null);
  const p = useSharedValue(0);
  const timer = useRef(null);

  useEffect(() => {
    emit = next => {
      clearTimeout(timer.current);
      setItem(next);
      p.value = 0;
      p.value = withSpring(1, { damping: 16, stiffness: 260 });
      timer.current = setTimeout(() => {
        p.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) }, done => {
          if (done) runOnJS(setItem)(null);
        });
      }, 1400);
    };
    return () => { emit = null; clearTimeout(timer.current); };
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: 0.85 + p.value * 0.15 }] }));
  if (!item) return null;

  return (
    <View pointerEvents="none" style={styles.host} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.box, style]}>
        <Glass style={[StyleSheet.absoluteFill, styles.glass]} intensity={80} fill={0.72} />
        <Icon name={item.icon} size={sizes.avatarLg} color={colors.text} strokeWidth={2.4} />
        <Text style={styles.text}>{item.text}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", zIndex: 100 },
  box:  {
    width: sizes.iconHero * 1.7, minHeight: sizes.iconHero * 1.5, overflow: "hidden",
    alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.lg,
    borderRadius: radii.xl, borderWidth: sizes.hairline, borderColor: GLASS_EDGE, ...GLASS_LIFT,
  },
  glass: { borderRadius: radii.xl },
  text: { ...type.smallStrong, color: colors.text, textAlign: "center" },
});
