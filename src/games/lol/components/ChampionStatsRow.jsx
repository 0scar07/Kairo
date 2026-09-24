import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { ProgressBar } from "../../../components/ui";
import { championIcon } from "../../../api/ddragon";
import { colors, radii, sizes, spacing, fontSizes, type, kdaColor, winrateColor, useAccent } from "../../../theme";

// Fila de estadísticas por campeón. `rank` (0,1,2…) muestra el puesto; `detail` reemplaza el subtítulo.
export default function ChampionStatsRow({ champ, rank, detail, game = "lol" }) {
  const accent = useAccent(game);
  const wrColor = winrateColor(champ.wr, accent);
  return (
    <View style={styles.row}>
      {rank !== undefined && (
        <Text style={[styles.rank, { color: colors.rank[rank] || colors.textMuted }]}>#{rank + 1}</Text>
      )}
      <Image source={{ uri: championIcon(champ.name) }} style={styles.img} />
      <View style={styles.info}>
        <Text style={styles.name}>{champ.name}</Text>
        <Text style={styles.games}>{detail || `${champ.games} partidas`}</Text>
      </View>
      <View style={styles.kdaBlock}>
        <Text style={styles.kdaText}>{champ.kills}/{champ.deaths}/{champ.assists}</Text>
        <Text style={[styles.kdaRatio, { color: kdaColor(champ.kda) }]}>{champ.kda} KDA</Text>
      </View>
      <View style={styles.wrBlock}>
        <Text style={[styles.wr, { color: wrColor }]}>{champ.wr}%</Text>
        <ProgressBar value={champ.wr} color={wrColor} height={sizes.barThin} width={spacing.xxxl - spacing.sm} style={styles.bar} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row:      {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingVertical: spacing.md, borderBottomWidth: sizes.hairline, borderBottomColor: colors.border,
  },
  rank:     { ...type.stat, fontSize: fontSizes.base, minWidth: spacing.xl },
  img:      { width: sizes.avatarLg, height: sizes.avatarLg, borderRadius: radii.md, backgroundColor: colors.surfaceHigh },
  info:     { flex: 1 },
  name:     { ...type.bodyStrong, color: colors.text },
  games:    { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
  kdaBlock: { alignItems: "flex-end" },
  kdaText:  { ...type.smallStrong, color: colors.text },
  kdaRatio: { ...type.caption },
  wrBlock:  { alignItems: "flex-end", minWidth: spacing.xxxl - spacing.xs },
  wr:       { ...type.heading, letterSpacing: 0 },
  bar:      { marginTop: spacing.xs },
});
