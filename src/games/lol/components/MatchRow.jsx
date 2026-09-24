import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { PressableScale } from "../../../components/ui";
import { championIcon } from "../../../api/ddragon";
import { csOf, queueLabel, kdaRatio as calcKda } from "../utils";
import { timeSince, formatDuration } from "../../../utils/format";
import { colors, radii, sizes, spacing, fontSizes, type, tracking, kdaColor, useAccent } from "../../../theme";

// Fila de una partida de LoL: resultado, campeón, cola, KDA y CS/daño. Al tocarla se expande el detalle.
export default function MatchRow({ match, myPuuid, onPress, expanded }) {
  const accent = useAccent("lol");
  if (!match?.info) return null;
  const me = match.info.participants.find(p => p.puuid === myPuuid);
  if (!me) return null;

  const win         = me.win;
  const resultColor = win ? colors.win : colors.loss;
  const kdaRatio    = calcKda(me.kills, me.deaths, me.assists);
  const dmg         = Math.round(me.totalDamageDealtToChampions / 1000);

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.985}
      style={[styles.row, {
        borderLeftColor: resultColor,
        backgroundColor: expanded
          ? (win ? colors.winBgStrong : colors.lossBgStrong)
          : (win ? colors.winBg : colors.lossBg),
      }]}
    >
      <View>
        <Image source={{ uri: championIcon(me.championName) }} style={styles.champImg} />
        <View style={styles.levelBadge}><Text style={styles.levelText}>{me.champLevel}</Text></View>
      </View>

      <View style={styles.info}>
        <Text style={[styles.result, { color: resultColor }]}>{win ? "VICTORIA" : "DERROTA"}</Text>
        <Text style={styles.champName} numberOfLines={1}>{me.championName}</Text>
        <Text style={styles.meta}>
          {queueLabel(match.info.queueId)} · {formatDuration(match.info.gameDuration)} · {timeSince(match.info.gameCreation)}
        </Text>
      </View>

      <View style={styles.stats}>
        <Text style={styles.kda}>{me.kills}/{me.deaths}/{me.assists}</Text>
        <Text style={[styles.ratio, { color: kdaColor(kdaRatio) }]}>{kdaRatio} KDA</Text>
        <Text style={styles.minor}>
          <Text style={{ color: accent }}>{dmg}k</Text> dmg · {csOf(me)} CS
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center",
    gap: spacing.md, padding: spacing.md,
    borderLeftWidth: sizes.borderAccent, borderRadius: radii.md, marginBottom: spacing.xs,
  },
  champImg:   { width: sizes.placement, height: sizes.placement, borderRadius: radii.md, backgroundColor: colors.surfaceHigh },
  levelBadge: {
    position: "absolute", right: -spacing.xs, bottom: -spacing.xs,
    backgroundColor: colors.bg, borderRadius: radii.pill, paddingHorizontal: spacing.xs,
    borderWidth: sizes.hairline, borderColor: colors.borderStrong,
  },
  levelText:  { ...type.micro, color: colors.textSecondary },
  info:       { flex: 1 },
  result:     { ...type.label, fontSize: fontSizes.xs, letterSpacing: tracking.wide },
  champName:  { ...type.bodyStrong, color: colors.text, marginTop: spacing.xxs },
  meta:       { ...type.micro, color: colors.textMuted, marginTop: spacing.xxs },
  stats:      { alignItems: "flex-end" },
  kda:        { ...type.bodyStrong, fontSize: fontSizes.base, color: colors.text },
  ratio:      { ...type.caption },
  minor:      { ...type.micro, color: colors.textMuted, marginTop: spacing.xxs },
});
