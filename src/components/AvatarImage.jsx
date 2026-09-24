import React from "react";
import { View, Image, Text, StyleSheet } from "react-native";
import GameLogo from "./GameLogo";
import { colors, radii, sizes, spacing, type, useAccent } from "../theme";

// Avatar circular con borde del color del juego y, opcionalmente, una insignia de nivel.
// Sin `uri` muestra el logo del juego.
export default function AvatarImage({ uri, level, game, size = sizes.iconHero }) {
  const accent = useAccent(game);
  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, borderColor: accent }]}>
        {uri
          ? <Image source={{ uri }} style={styles.image} resizeMode="cover" />
          : <GameLogo game={game} size={size / 2} color={accent} />}
      </View>
      {level != null && (
        <View style={[styles.badge, { backgroundColor: accent }]}>
          <Text style={styles.badgeText}>{level}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle:    {
    borderWidth: sizes.borderAccent, backgroundColor: colors.surfaceHigh, overflow: "hidden",
    alignItems: "center", justifyContent: "center",
  },
  image:     { width: "100%", height: "100%" },
  badge:     {
    position: "absolute", bottom: -spacing.sm + spacing.xxs, alignSelf: "center",
    paddingHorizontal: spacing.sm - spacing.xxs, paddingVertical: spacing.xxs, borderRadius: radii.md,
  },
  badgeText: { ...type.label, color: colors.onAccent },
});
