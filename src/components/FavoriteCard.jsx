import React from "react";
import { useT } from "../i18n/I18nProvider";
import { View, Text, Image, StyleSheet } from "react-native";
import { PressableScale } from "./ui";
import { getGame } from "../games";
import { profileIconUrl } from "../api/ddragon";
import RankEmblem from "./RankEmblem";
import Icon from "./Icon";
import GameLogo from "./GameLogo";
import BellButton from "../notifications/BellButton";
import { tierLabel, formatNumber } from "../utils/format";
import { getRegion } from "../constants/regions";
import { colors, radii, sizes, spacing, fontSizes, type, withAlpha } from "../theme";

// Texto de estado de un favorito de Supercell (trofeos o ayuntamiento), en el idioma activo; `label` es el formato antiguo
function favoriteStat(fav, t) {
  if (fav.trophies != null) return t("sc.trophiesBadge", { n: formatNumber(fav.trophies) });
  if (fav.townHall != null) return t("coc.townHallLevel", { level: fav.townHall });
  return fav.label || null;
}

// Tarjeta de favorito: ícono, nombre, región y rango con el color del tier
// onToggleAlerts: si se pasa (solo LoL en Android) aparece la campanita de alertas de partida en vivo
export default function FavoriteCard({ fav, onPress, onRemove, onToggleAlerts, style }) {
  const t = useT();
  const game = getGame(fav.gameId);
  const tierColor = colors.tier[fav.tier];
  // "#TAG · LAN" (Riot), "#TAG" (Supercell) o "PC" (juegos por nombre con plataforma)
  const platform = game?.platforms?.find(p => p.id === fav.region)?.label;
  const subline = [fav.tagLine ? `#${fav.tagLine}` : null, game?.hasRegion === false ? platform : getRegion(fav.region).label].filter(Boolean).join(" · ");
  const tint = tierColor || game?.accent || colors.textMuted;
  // Ícono: URL directa (Supercell) o ícono de invocador (Riot)
  const iconUri = fav.iconUrl || (fav.iconId != null ? profileIconUrl(fav.iconId) : null);

  return (
    <PressableScale
      haptic
      onPress={onPress}
      style={[styles.card, { borderColor: withAlpha(tint, 0.4), backgroundColor: withAlpha(tint, 0.05) }, style]}
    >
      <View style={styles.top}>
        {iconUri ? (
          <Image source={{ uri: iconUri }} style={[styles.icon, { borderColor: tint }]} />
        ) : (
          <View style={[styles.icon, styles.iconPlaceholder, { borderColor: tint }]}>
            <GameLogo game={fav.gameId} size={sizes.item} color={tint} />
          </View>
        )}
        <View style={styles.actions}>
          {onToggleAlerts && <BellButton active={fav.alerts === true} accent={game?.accent || colors.textMuted} onPress={onToggleAlerts} />}
          {onRemove && (
            <PressableScale onPress={onRemove} scaleTo={0.8} hitSlop={spacing.md} style={styles.remove} accessibilityLabel={t("favorites.remove")}>
              <Icon name="close" size={fontSizes.base} color={colors.textFaint} />
            </PressableScale>
          )}
        </View>
      </View>

      <Text style={styles.name} numberOfLines={1}>{fav.gameName}</Text>
      <Text style={styles.tag} numberOfLines={1}>{subline}</Text>

      <View style={[styles.rank, { backgroundColor: withAlpha(tint, 0.14) }]}>
        {fav.tier ? <RankEmblem tier={fav.tier} size={sizes.item} /> : null}
        <Text style={[styles.rankText, { color: tierColor || colors.textMuted }]} numberOfLines={1}>
          {fav.tier ? tierLabel(fav.tier, fav.rank) : (game?.favoriteStat ? game.favoriteStat(fav) : favoriteStat(fav, t)) || t("common.noRank")}
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
  actions:         { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  remove:          { padding: spacing.xs },
  name:            { ...type.bodyStrong, fontSize: fontSizes.base, color: colors.text },
  tag:             { ...type.caption, color: colors.textMuted },
  rank:            { marginTop: spacing.sm, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.pill },
  rankText:        { ...type.captionStrong },
});
