import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Card from "./Card";
import { colors, radii, spacing, type, fontSizes, useAccent, withAlpha } from "../../theme";

// Cabecera de perfil: avatar + nombre#tag + insignia + acción (favorito, editar) a la derecha
export default function ProfileHeader({ avatar, name, tag, badge, subtitle, game, action, onAction }) {
  const accent = useAccent(game);
  return (
    <Card style={styles.card}>
      {avatar}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <Text style={styles.tag}>#{tag}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {badge ? (
          <View style={[styles.badge, { backgroundColor: withAlpha(accent, 0.12) }]}>
            <Text style={[styles.badgeText, { color: accent }]}>{badge}</Text>
          </View>
        ) : null}
      </View>
      {action ? (
        <TouchableOpacity onPress={onAction} style={styles.action}>
          <Text style={styles.actionText}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card:      { flexDirection: "row", alignItems: "center" },
  info:      { marginLeft: spacing.lg, flex: 1 },
  name:      { ...type.title, color: colors.text },
  tag:       { ...type.small, color: colors.textMuted },
  subtitle:  { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
  badge:     {
    marginTop: spacing.sm, alignSelf: "flex-start",
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill,
  },
  badgeText: { ...type.smallStrong },
  action:    { padding: spacing.sm },
  actionText:{ fontSize: fontSizes.xxl },
});
