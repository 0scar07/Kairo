import React from "react";
import { View, Text, StyleSheet } from "react-native";
import PressableScale from "./PressableScale";
import { colors, radii, sizes, spacing, fontSizes, type, useAccent, withAlpha } from "../../theme";

// Estado vacío amable: ícono, título, texto y una acción opcional
export default function EmptyState({ icon = "🗂️", title, text, actionLabel, onAction, compact }) {
  const accent = useAccent();
  return (
    <View style={[styles.wrap, compact && styles.compact]}>
      <View style={[styles.iconWrap, { backgroundColor: withAlpha(accent, 0.1), borderColor: withAlpha(accent, 0.25) }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
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
  icon:       { fontSize: fontSizes.hero },
  title:      { ...type.heading, color: colors.text, textAlign: "center" },
  text:       { ...type.body, color: colors.textMuted, textAlign: "center", marginTop: spacing.sm },
  action:     {
    marginTop: spacing.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderRadius: radii.pill, borderWidth: sizes.hairline,
  },
  actionText: { ...type.bodyStrong },
});
