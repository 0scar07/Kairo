import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Card from "./Card";
import PressableScale from "./PressableScale";
import { colors, radii, sizes, spacing, type, fontSizes, glow, useAccent, withAlpha } from "../../theme";

// Cabecera de perfil: avatar grande con resplandor del color del rango + nombre#tag + insignia + acción
export default function ProfileHeader({
  avatar, name, tag, badge, badgeIcon, subtitle, game, glowColor, action, onAction, avatarSize,
}) {
  const accent = useAccent(game);
  const tint = glowColor || accent;
  return (
    <Card style={[styles.card, { borderColor: withAlpha(tint, 0.35), backgroundColor: withAlpha(tint, 0.05) }]}>
      <View style={[styles.avatar, avatarSize && { borderRadius: avatarSize / 2 }, glow(tint, spacing.xl, 0.5)]}>{avatar}</View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <Text style={styles.tag}>#{tag}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {badge ? (
          <View style={[styles.badge, { backgroundColor: withAlpha(tint, 0.14), borderColor: withAlpha(tint, 0.4) }]}>
            {badgeIcon}
            <Text style={[styles.badgeText, { color: tint }]}>{badge}</Text>
          </View>
        ) : null}
      </View>
      {action ? (
        <PressableScale onPress={onAction} haptic scaleTo={0.85} style={styles.action} accessibilityLabel="Favorito">
          {typeof action === "string" ? <Text style={styles.actionText}>{action}</Text> : action}
        </PressableScale>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card:      { flexDirection: "row", alignItems: "center" },
  avatar:    { borderRadius: radii.pill },
  info:      { marginLeft: spacing.lg, flex: 1 },
  name:      { ...type.title, color: colors.text },
  tag:       { ...type.small, color: colors.textMuted },
  subtitle:  { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
  badge:     {
    marginTop: spacing.sm, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: spacing.xs, borderWidth: sizes.hairline,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill,
  },
  badgeText: { ...type.smallStrong },
  action:    { padding: spacing.sm },
  actionText:{ fontSize: fontSizes.xxl },
});
