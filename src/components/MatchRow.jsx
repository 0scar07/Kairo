import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { championIcon } from "../api/ddragon";
import { csOf, queueLabel, kdaRatio as calcKda } from "../utils/lol";
import { colors, radii, sizes, spacing, fontSizes, type, tracking, kdaColor, useAccent } from "../theme";

function timeSince(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)    return `${s}s`;
  if (s < 3600)  return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function formatDuration(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function MatchRow({ match, myPuuid, onPress, expanded }) {
  const accent = useAccent("lol");
  if (!match?.info) return null;
  const me = match.info.participants.find(p => p.puuid === myPuuid);
  if (!me) return null;

  const win         = me.win;
  const resultColor = win ? colors.win : colors.loss;
  const kda         = `${me.kills}/${me.deaths}/${me.assists}`;
  const kdaRatio    = calcKda(me.kills, me.deaths, me.assists);
  const dmg = Math.round(me.totalDamageDealtToChampions / 1000);
  const ago = timeSince(match.info.gameCreation);
  const dur = formatDuration(match.info.gameDuration);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.row, {
        borderLeftColor: resultColor,
        backgroundColor: expanded
          ? (win ? colors.winBgStrong : colors.lossBgStrong)
          : (win ? colors.winBg : colors.lossBg),
      }]}
      activeOpacity={0.7}
    >
      <Image source={{ uri: championIcon(me.championName) }} style={styles.champImg} />
      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text style={[styles.result, { color: resultColor }]}>
            {win ? "VICTORIA" : "DERROTA"}
          </Text>
          <Text style={styles.meta}>{dur} · {ago}</Text>
        </View>
        <Text style={styles.champName}>{me.championName}</Text>
        <Text style={styles.queue}>{queueLabel(match.info.queueId)}</Text>
      </View>
      <View style={styles.kdaBlock}>
        <Text style={styles.kdaText}>{kda}</Text>
        <Text style={[styles.kdaRatio, { color: kdaColor(kdaRatio) }]}>{kdaRatio} KDA</Text>
      </View>
      <View style={styles.dmgBlock}>
        <Text style={[styles.dmgText, { color: accent }]}>{dmg}k dmg</Text>
        <Text style={styles.csText}>{csOf(me)} CS</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center",
    gap: spacing.md, padding: spacing.md, paddingHorizontal: spacing.lg,
    borderLeftWidth: sizes.borderAccent, borderRadius: radii.md, marginBottom: spacing.xs,
  },
  champImg: { width: sizes.avatarLg, height: sizes.avatarLg, borderRadius: radii.sm, backgroundColor: colors.surfaceHigh },
  info:     { flex: 1 },
  topRow:   { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  result:   { ...type.label, fontSize: fontSizes.sm, letterSpacing: tracking.wide },
  meta:     { ...type.caption, color: colors.textMuted },
  champName:{ ...type.bodyStrong, color: colors.text, marginTop: spacing.xxs },
  queue:    { ...type.micro, color: colors.textMuted, marginTop: spacing.xxs },
  kdaBlock: { alignItems: "flex-end" },
  kdaText:  { ...type.bodyStrong, color: colors.text },
  kdaRatio: { ...type.caption },
  dmgBlock: { alignItems: "flex-end", minWidth: spacing.xxxl + spacing.sm },
  dmgText:  { ...type.smallStrong },
  csText:   { ...type.caption, color: colors.textMuted },
});
