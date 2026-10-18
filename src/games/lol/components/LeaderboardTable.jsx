import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useT } from "../../../i18n/I18nProvider";
import { winrate } from "../../../utils/format";
import { colors, sizes, spacing, fontSizes, type, winrateColor, useAccent } from "../../../theme";

// Ranking como tabla (# · Jugador · LP · Winrate). La cabecera va aparte para poder usarla sobre una FlatList.
export function LeaderboardHead() {
  const t = useT();
  return (
    <View style={[styles.row, styles.head]} accessibilityRole="header">
      <Text style={[styles.headText, styles.pos]}>#</Text>
      <Text style={[styles.headText, styles.who]}>{t("explore.colPlayer")}</Text>
      <Text style={[styles.headText, styles.lp]}>LP</Text>
      <Text style={[styles.headText, styles.wr]}>{t("stats.winrate")}</Text>
    </View>
  );
}

// Una fila; sin nombre (la cuenta no se pudo leer) no se puede abrir el perfil
export function LeaderboardRow({ player, position, onPress }) {
  const t = useT();
  const accent = useAccent("lol");
  const wr = winrate(player.wins, player.losses);
  const games = player.wins + player.losses;
  const named = Boolean(player.gameName);
  return (
    <Pressable
      onPress={named ? onPress : undefined}
      disabled={!named}
      style={({ pressed }) => [styles.row, styles.body, pressed && styles.pressed]}
      accessibilityRole={named ? "button" : undefined}
      accessibilityLabel={`${position}. ${named ? `${player.gameName} #${player.tagLine}` : t("explore.unknown")}, ${player.leaguePoints} LP, ${wr}%`}
    >
      <Text style={[styles.posText, styles.pos, { color: colors.rank[position - 1] || colors.textMuted }]}>{position}</Text>
      <View style={styles.who}>
        <Text style={[styles.name, !named && styles.unknown]} numberOfLines={1}>{named ? player.gameName : t("explore.unknown")}</Text>
        <Text style={styles.sub} numberOfLines={1}>{named ? `#${player.tagLine} · ` : ""}{t("common.games", { count: games })}</Text>
      </View>
      <Text style={[styles.value, styles.lp]}>{player.leaguePoints}</Text>
      <Text style={[styles.value, styles.wr, { color: winrateColor(wr, accent) }]}>{wr}%</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row:      { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md },
  head:     { minHeight: spacing.xxl + spacing.xxs, backgroundColor: colors.surfaceRaised },
  headText: { ...type.label, color: colors.textMuted },
  body:     { minHeight: sizes.button + spacing.sm, backgroundColor: colors.surface, borderTopWidth: sizes.hairline, borderTopColor: colors.border, paddingVertical: spacing.xs },
  pressed:  { backgroundColor: colors.surfaceRaised },
  pos:      { width: spacing.xxl + spacing.xxs },
  posText:  { ...type.stat, fontSize: fontSizes.base, fontVariant: ["tabular-nums"] },
  who:      { flex: 1, minWidth: 0, paddingRight: spacing.sm },
  name:     { ...type.bodyStrong, fontSize: fontSizes.base, color: colors.text },
  unknown:  { color: colors.textMuted },
  sub:      { ...type.caption, color: colors.textMuted },
  lp:       { width: sizes.avatarXl - spacing.sm, textAlign: "right" },
  wr:       { width: sizes.avatarXl - spacing.md, textAlign: "right" },
  value:    { ...type.stat, fontSize: fontSizes.base, color: colors.text, fontVariant: ["tabular-nums"] },
});
