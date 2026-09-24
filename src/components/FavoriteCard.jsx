import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { PressableScale } from "./ui";
import { getGame } from "../games";
import { profileIconUrl } from "../api/ddragon";
import RankEmblem from "./RankEmblem";
import GameLogo from "./GameLogo";
import { tierLabel } from "../utils/format";
import { getRegion } from "../constants/regions";
import { colors, radii, sizes, spacing, fontSizes, type, withAlpha } from "../theme";

// Tarjeta de favorito: ícono, nombre, región y rango con el color del tier
export default function FavoriteCard({ fav, onPress, onRemove, style }) {
  const game = getGame(fav.gameId);
  const tierColor = colors.tier[fav.tier];
  const tint = tierColor || game?.accent || colors.textMuted;

  return (
    <PressableScale
      haptic
      onPress={onPress}
      style={[styles.card, { borderColor: withAlpha(tint, 0.4), backgroundColor: withAlpha(tint, 0.05) }, style]}
    >
      <View style={styles.top}>
        {fav.iconId != null ? (
          <Image source={{ uri: profileIconUrl(fav.iconId) }} style={[styles.icon, { borderColor: tint }]} />
        ) : (
          <View style={[styles.icon, styles.iconPlaceholder, { borderColor: tint }]}>
            <GameLogo game={fav.gameId} size={sizes.item} color={tint} />
          </View>
        )}
        {onRemove && (
          <PressableScale onPress={onRemove} scaleTo={0.8} hitSlop={spacing.md} style={styles.remove} accessibilityLabel="Quitar de favoritos">
            <Text style={styles.removeText}>✕</Text>
          </PressableScale>
        )}
      </View>

      <Text style={styles.name} numberOfLines={1}>{fav.gameName}</Text>
      <Text style={styles.tag} numberOfLines={1}>#{fav.tagLine} · {getRegion(fav.region).label}</Text>

      <View style={[styles.rank, { backgroundColor: withAlpha(tint, 0.14) }]}>
        {fav.tier ? <RankEmblem tier={fav.tier} size={sizes.item} /> : null}
        <Text style={[styles.rankText, { color: tierColor || colors.textMuted }]} numberOfLines={1}>
          {fav.tier ? tierLabel(fav.tier, fav.rank) : "Sin rango"}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card:            {
    borderRadius: radii.lg, borderWidth: sizes.hairline, padding: spacing.md,
    gap: spacing.xxs,
  },
  top:             { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.sm },
  icon:            { width: sizes.avatarLg + spacing.sm, height: sizes.avatarLg + spacing.sm, borderRadius: radii.pill, borderWidth: sizes.borderThick },
  iconPlaceholder: { backgroundColor: colors.surfaceHigh, alignItems: "center", justifyContent: "center" },
  remove:          { padding: spacing.xs },
  removeText:      { ...type.caption, color: colors.textFaint },
  name:            { ...type.bodyStrong, fontSize: fontSizes.base, color: colors.text },
  tag:             { ...type.caption, color: colors.textMuted },
  rank:            { marginTop: spacing.sm, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.pill },
  rankText:        { ...type.captionStrong },
});
