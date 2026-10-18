import React from "react";
import { useT } from "../../../i18n/I18nProvider";
import { View, Text, Image, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { PressableScale } from "../../../components/ui";
import { championIcon, championLabel } from "../../../api/ddragon";
import { csOf, queueLabel, kdaRatio as calcKda } from "../utils";
import { timeSince, formatDuration } from "../../../utils/format";
import { colors, radii, sizes, spacing, fontSizes, type, tracking, kdaColor } from "../../../theme";

// Fila de una partida de LoL: lo más grande es el K/D/A; el resultado lo marca la franja lateral y la etiqueta.
// Al tocarla se expande el detalle.
const STRIPE_SPRING = { damping: 18, stiffness: 380, mass: 0.5 };

export default function MatchRow({ match, myPuuid, onPress, expanded }) {
  const t = useT();
  const press = useSharedValue(0);
  const stripe = useAnimatedStyle(() => ({ width: sizes.bar + press.value * sizes.bar, opacity: 0.85 + press.value * 0.15 }));
  if (!match?.info) return null;
  const me = match.info.participants.find(p => p.puuid === myPuuid);
  if (!me) return null;

  const win         = me.win;
  const resultColor = win ? colors.win : colors.loss;
  const kdaRatio    = calcKda(me.kills, me.deaths, me.assists);
  const dmg         = Math.round(me.totalDamageDealtToChampions / 1000);
  const champ       = championLabel(me.championName);

  return (
    <PressableScale
      onPress={onPress}
      onPressIn={() => { press.value = withSpring(1, STRIPE_SPRING); }}
      onPressOut={() => { press.value = withSpring(0, STRIPE_SPRING); }}
      scaleTo={0.985}
      accessibilityLabel={`${win ? t("results.victory") : t("results.defeat")}, ${champ}, ${me.kills}/${me.deaths}/${me.assists}, ${kdaRatio} KDA`}
      accessibilityState={{ expanded: !!expanded }}
      style={[styles.row, expanded && styles.rowOpen]}
    >
      <Animated.View style={[styles.stripe, { backgroundColor: resultColor }, stripe]} />
      <View>
        <Image source={{ uri: championIcon(me.championName) }} style={styles.champImg} />
        <View style={styles.levelBadge}><Text style={styles.levelText}>{me.champLevel}</Text></View>
      </View>

      <View style={styles.info}>
        <Text style={[styles.result, { color: resultColor }]} numberOfLines={1}>
          {win ? t("results.victory") : t("results.defeat")} · {champ.toUpperCase()}
        </Text>
        <Text style={styles.kda}>
          {me.kills}<Text style={styles.slash}> / </Text>
          <Text style={!win && { color: colors.loss }}>{me.deaths}</Text>
          <Text style={styles.slash}> / </Text>{me.assists}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {queueLabel(match.info.queueId)} · {formatDuration(match.info.gameDuration)} · {timeSince(match.info.gameCreation)}
        </Text>
      </View>

      <View style={styles.stats}>
        <Text style={[styles.ratio, { color: kdaColor(kdaRatio) }]}>{kdaRatio}</Text>
        <Text style={styles.ratioUnit}>KDA</Text>
        <Text style={styles.minor}>{dmg}k · {csOf(me)} CS</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", overflow: "hidden",
    gap: spacing.md, paddingVertical: spacing.md, paddingRight: spacing.md, paddingLeft: spacing.md + spacing.xs,
    backgroundColor: colors.surface, borderWidth: sizes.hairline, borderColor: colors.border,
    borderRadius: radii.lg, marginBottom: spacing.sm,
  },
  rowOpen:    { backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong },
  stripe:     { position: "absolute", left: 0, top: 0, bottom: 0, width: sizes.bar },
  champImg:   { width: sizes.placement + spacing.xs, height: sizes.placement + spacing.xs, borderRadius: radii.md, backgroundColor: colors.surfaceHigh },
  levelBadge: {
    position: "absolute", right: -spacing.xs, bottom: -spacing.xs,
    backgroundColor: colors.surfaceRaised, borderRadius: radii.pill, paddingHorizontal: spacing.xs,
    borderWidth: sizes.hairline, borderColor: colors.borderStrong,
  },
  levelText:  { ...type.micro, color: colors.text },
  info:       { flex: 1, minWidth: 0 },
  result:     { ...type.label, letterSpacing: tracking.wide },
  kda:        { ...type.stat, color: colors.text, fontVariant: ["tabular-nums"], marginTop: spacing.xxs },
  slash:      { color: colors.textMuted },
  meta:       { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
  stats:      { alignItems: "flex-end" },
  ratio:      { ...type.heading, fontVariant: ["tabular-nums"] },
  ratioUnit:  { ...type.caption, color: colors.textMuted },
  minor:      { ...type.micro, color: colors.textMuted, marginTop: spacing.xxs, fontSize: fontSizes.xxs },
});
