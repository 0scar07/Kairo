import React, { useEffect, useLayoutEffect, useState } from "react";
import { View, Text, ScrollView, Linking, StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { Card, ErrorState, PressableScale, Skeleton } from "../../components/ui";
import Icon from "../../components/Icon";
import { LiveTag, TeamCrest } from "../wildrift/components";
import { fmtDay, fmtTime, getMatch, stageLabel } from "./api";
import { useT } from "../../i18n/I18nProvider";
import { errorMessage } from "../../utils/format";
import { accents, colors, fontSizes, radii, sizes, spacing, type, withAlpha } from "../../theme";

const ACCENT = accents.valorant;
const SIDE_A = ACCENT;          // cada lado con su color, como atacantes y defensores
const SIDE_B = colors.info;

/** Fondo partido en dos colores, uno por equipo */
function SplitGlow() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <LinearGradient id="valA" x1="0" y1="0" x2="1" y2="0.6">
          <Stop offset="0" stopColor={SIDE_A} stopOpacity="0.34" />
          <Stop offset="0.55" stopColor={SIDE_A} stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="valB" x1="1" y1="0" x2="0" y2="0.6">
          <Stop offset="0" stopColor={SIDE_B} stopOpacity="0.30" />
          <Stop offset="0.55" stopColor={SIDE_B} stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="valFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0.55" stopColor={colors.bg} stopOpacity="0" />
          <Stop offset="1" stopColor={colors.bg} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#valA)" />
      <Rect width="100%" height="100%" fill="url(#valB)" />
      <Rect width="100%" height="100%" fill="url(#valFade)" />
    </Svg>
  );
}

/**
 * Detalle de un partido de Valorant: los dos equipos con su marcador, quién ganó cada mapa (PandaScore gratis no da
 * el nombre del mapa), la fecha, el torneo y el enlace a la transmisión.
 *  - params: { id }
 */
export default function MatchScreen({ route, navigation }) {
  const t = useT();
  const { id } = route.params;
  const [state, setState] = useState({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    getMatch(id)
      .then(match => { if (alive) setState({ status: "ready", match }); })
      .catch(e => { if (alive) setState({ status: "error", message: errorMessage(e) }); });
    return () => { alive = false; };
  }, [id, attempt]);

  const match = state.match;
  useLayoutEffect(() => { if (match) navigation.setOptions({ title: stageLabel(match.stage, t) || match.tournament || "Valorant" }); }, [match]);

  if (state.status === "loading") {
    return <View style={[styles.container, styles.pad]}><Skeleton height={sizes.chart * 2} radius={radii.xl} style={styles.gap} /><Skeleton height={sizes.chart} radius={radii.lg} style={styles.gap} /></View>;
  }
  if (state.status === "error") return <View style={styles.center}><ErrorState message={state.message} onRetry={() => setAttempt(n => n + 1)} /></View>;

  const [a, b] = match.teams;
  const done = match.status === "finished";
  const live = match.status === "running";
  const isWinner = tm => done && match.winnerId != null && tm?.id === match.winnerId;
  const isFinal = /grand final/i.test(match.stage || "");
  const maps = Array.from({ length: match.bestOf || match.games.length || 0 }, (_, i) => match.games.find(g => g.position === i + 1) || null);
  const short = tm => tm?.acronym || tm?.name || "?";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <SplitGlow />
        <Text style={styles.stage} numberOfLines={1}>{[match.serie, match.tournament].filter(Boolean).join(" · ").toUpperCase()}</Text>
        <Text style={styles.sub}>{[stageLabel(match.stage, t), match.bestOf ? `BO${match.bestOf}` : null].filter(Boolean).join(" · ")}</Text>
        {live ? <View style={styles.liveTag}><LiveTag text={t("wr.live")} /></View> : null}
        <View style={styles.big}>
          {[a, b].map((tm, i) => (
            <View key={i} style={styles.team}>
              <View style={[styles.crestRing, isWinner(tm) && styles.crestWin]}><TeamCrest team={tm} size={sizes.avatarHero - spacing.xs} /></View>
              <Text style={styles.teamName} numberOfLines={2}>{tm?.name || t("val.tbd")}</Text>
              {done ? <Text style={[styles.teamTag, isWinner(tm) && { color: colors.gold }]}>{isWinner(tm) ? (isFinal ? `🏆 ${t("val.champ")}` : t("val.winner")) : isFinal ? t("val.runnerUp") : ""}</Text> : null}
            </View>
          ))}
          <View style={styles.score} pointerEvents="none">
            {done || live
              ? <Text style={styles.scoreText}>{a?.score ?? 0}<Text style={styles.colon}>:</Text>{b?.score ?? 0}</Text>
              : <Text style={styles.vsText}>VS</Text>}
          </View>
        </View>
      </View>

      <View style={styles.pad}>
        {maps.length ? (
          <>
            <Text style={styles.section}>{t("val.mapByMap")}</Text>
            <View style={styles.maps}>
              {maps.map((g, i) => {
                const winA = g?.winnerId != null && g.winnerId === a?.id;
                const winB = g?.winnerId != null && g.winnerId === b?.id;
                return (
                  <View key={i} style={[styles.map, winA && styles.mapA, winB && styles.mapB]}>
                    <Text style={styles.mapLabel}>{t("val.map", { n: i + 1 })}</Text>
                    <Text style={styles.mapWinner} numberOfLines={1}>{winA ? short(a) : winB ? short(b) : "—"}</Text>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}

        <Card style={styles.info} padded={false}>
          {[
            [t("val.date"), match.beginAt ? `${fmtDay(match.beginAt)} · ${fmtTime(match.beginAt)}` : "—"],
            [t("val.event"), match.serie || match.league?.name || "—"],
            [t("val.phase"), [match.tournament, stageLabel(match.stage, t)].filter(Boolean).join(" · ") || "—"],
          ].map(([label, value], i) => (
            <View key={label} style={[styles.infoRow, i && styles.sep]}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
            </View>
          ))}
        </Card>

        {match.stream ? (
          <PressableScale onPress={() => Linking.openURL(match.stream)} haptic scaleTo={0.97} style={[styles.watch, !live && styles.watchGhost]} accessibilityRole="link">
            <Icon name="eye" size={fontSizes.lg} color={live ? colors.onAccent : colors.textSecondary} />
            <Text style={[styles.watchText, !live && styles.watchTextGhost]}>{live ? t("val.watchLive") : done ? t("val.watchReplay") : t("val.watchChannel")}</Text>
          </PressableScale>
        ) : null}
        <Text style={styles.source}>{t("val.source")}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center:    { flex: 1, backgroundColor: colors.bg, justifyContent: "center" },
  content:   { paddingBottom: spacing.hero },
  pad:       { paddingHorizontal: spacing.lg },
  gap:       { marginTop: spacing.md },
  hero:      { paddingTop: spacing.xl, paddingBottom: spacing.lg, paddingHorizontal: spacing.lg, alignItems: "center", overflow: "hidden" },
  stage:     { ...type.micro, color: colors.gold, letterSpacing: 1.2 },
  sub:       { ...type.captionStrong, color: colors.textSecondary, marginTop: spacing.xxs },
  liveTag:   { marginTop: spacing.sm },
  big:       { flexDirection: "row", justifyContent: "space-between", alignSelf: "stretch", marginTop: spacing.lg },
  team:      { width: sizes.iconHero + spacing.xl, alignItems: "center", gap: spacing.xs },
  crestRing: { padding: spacing.xxs, borderRadius: radii.xl, borderWidth: sizes.borderThick, borderColor: "transparent" },
  crestWin:  { borderColor: colors.gold },
  teamName:  { ...type.bodyStrong, color: colors.text, textAlign: "center" },
  teamTag:   { ...type.micro, color: colors.textSecondary },
  score:     { ...StyleSheet.absoluteFillObject, alignItems: "center", paddingTop: spacing.lg },
  scoreText: { ...type.largeTitle, fontSize: fontSizes.hero + spacing.md, color: colors.text, fontVariant: ["tabular-nums"] },
  colon:     { color: colors.textMuted },
  vsText:    { ...type.title, color: colors.textMuted },
  section:   { ...type.section, color: colors.text, marginBottom: spacing.sm },
  maps:      { flexDirection: "row", gap: spacing.xs },
  map:       { flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: radii.md, borderWidth: sizes.hairline, borderColor: colors.border, backgroundColor: colors.surface },
  mapA:      { borderColor: withAlpha(SIDE_A, 0.6), backgroundColor: withAlpha(SIDE_A, 0.12) },
  mapB:      { borderColor: withAlpha(SIDE_B, 0.6), backgroundColor: withAlpha(SIDE_B, 0.12) },
  mapLabel:  { ...type.micro, color: colors.textMuted },
  mapWinner: { ...type.captionStrong, color: colors.text, marginTop: spacing.xxs },
  info:      { marginTop: spacing.md },
  infoRow:   { flexDirection: "row", justifyContent: "space-between", gap: spacing.md, paddingVertical: spacing.sm + spacing.xxs, paddingHorizontal: spacing.md },
  infoLabel: { ...type.caption, color: colors.textSecondary },
  infoValue: { ...type.captionStrong, color: colors.text, flexShrink: 1, textAlign: "right" },
  sep:       { borderTopWidth: sizes.hairline, borderTopColor: colors.border },
  watch:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, height: sizes.avatarLg + spacing.sm, borderRadius: radii.lg, marginTop: spacing.md, backgroundColor: ACCENT },
  watchGhost:{ backgroundColor: colors.surface, borderWidth: sizes.hairline, borderColor: colors.border },
  watchText: { ...type.bodyStrong, color: colors.onAccent },
  watchTextGhost: { color: colors.textSecondary },
  source:    { ...type.micro, color: colors.textMuted, marginTop: spacing.lg },
});
