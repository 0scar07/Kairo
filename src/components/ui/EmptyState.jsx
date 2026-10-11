import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from "react-native-reanimated";
import PressableScale from "./PressableScale";
import Icon from "../Icon";
import { colors, radii, sizes, spacing, type, useAccent, withAlpha } from "../../theme";

// Estado vacío amable: ícono (nombre de Icon.jsx), título, texto y una acción opcional
export default function EmptyState({ icon = "inbox", title, text, actionLabel, onAction, compact }) {
  const accent = useAccent();
  const p = useSharedValue(0);
  useEffect(() => { p.value = withDelay(120, withSpring(1, { damping: 11, stiffness: 180 })); }, []);
  const pop = useAnimatedStyle(() => ({ opacity: Math.min(p.value * 1.4, 1), transform: [{ scale: 0.6 + p.value * 0.4 }] }));
  return (
    <View style={[styles.wrap, compact && styles.compact]}>
      <Animated.View style={[styles.iconWrap, { backgroundColor: withAlpha(accent, 0.1), borderColor: withAlpha(accent, 0.25) }, pop]}>
        <Icon name={icon} size={sizes.avatarMd} color={accent} />
      </Animated.View>
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      {text ? <Text style={styles.text}>{text}</Text> : null}
      {actionLabel ? (
        <PressableScale onPress={onAction} haptic style={[styles.action, { borderColor: withAlpha(accent, 0.5) }]}>
          <Text style={[styles.actionText, { color: accent }]}>{actionLabel}</Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:       { alignItems: "center", paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl },
  compact:    { paddingVertical: spacing.xl },
  iconWrap:   {
    width: sizes.iconHero - spacing.xl, height: sizes.iconHero - spacing.xl, borderRadius: radii.pill,
    borderWidth: sizes.hairline, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg,
  },
  title:      { ...type.heading, color: colors.text, textAlign: "center" },
  text:       { ...type.body, color: colors.textMuted, textAlign: "center", marginTop: spacing.sm },
  action:     {
    marginTop: spacing.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderRadius: radii.pill, borderWidth: sizes.hairline,
  },
  actionText: { ...type.bodyStrong },
});
