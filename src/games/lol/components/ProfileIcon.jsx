import React from "react";
import { View, Image, Text, StyleSheet } from "react-native";
import { profileIconUrl } from "../../../api/ddragon";
import { colors, radii, sizes, spacing, type, useAccent } from "../../../theme";

export default function ProfileIcon({ iconId, level, size = sizes.iconHero, game = "lol" }) {
  const accent = useAccent(game);
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Image
        source={{ uri: profileIconUrl(iconId) }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2, borderColor: accent }]}
      />
      {level != null && (
        <View style={[styles.levelBadge, { backgroundColor: accent }]}>
          <Text style={styles.levelText}>{level}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative" },
  image: {
    borderWidth: sizes.borderAccent,
    backgroundColor: colors.surfaceHigh,
  },
  levelBadge: {
    position: "absolute",
    bottom: -spacing.sm + spacing.xxs,
    alignSelf: "center",
    paddingHorizontal: spacing.sm - spacing.xxs,
    paddingVertical: spacing.xxs,
    borderRadius: radii.md,
  },
  levelText: { ...type.label, color: colors.onAccent },
});
