import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Linking, AppState, Platform, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import Animated, {
  Easing, FadeInDown, LinearTransition, cancelAnimation, interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue,
  withRepeat, withSequence, withSpring, withTiming,
} from "react-native-reanimated";
import { Card, ErrorState, PressableScale, Skeleton, showHud } from "../../components/ui";
import Icon from "../../components/Icon";
import { LiveTag, TeamCrest } from "../wildrift/components";
import { fmtDay, fmtTime, getMatch, stageLabel } from "./api";
import { useT } from "../../i18n/I18nProvider";
import { errorMessage } from "../../utils/format";
import { isFollowingTeam, loadFollowedTeams, onFollowedTeamsChanged, toggleFollowTeam } from "../../utils/followedTeams";
import { getPermission, requestPermission } from "../../notifications/push";
import { syncTeamAlerts } from "../../notifications/teamAlerts";
import { select, success } from "../../utils/haptics";
import { accents, colors, fontSizes, radii, sizes, spacing, type, withAlpha } from "../../theme";

const ACCENT = accents.valorant;
const SIDE_A = ACCENT;          // cada lado con su color, como atacantes y defensores
const SIDE_B = colors.info;
const LIVE_EVERY_MS = 30_000;   // modo espectador: el marcador se vuelve a pedir cada 30 s mientras se juega

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

/** Un número del marcador: cuando cambia salta, brilla con el color del equipo y vuelve a su sitio */
function ScoreNumber({ value, color }) {
  const reduce = useReducedMotion();
  const pop = useSharedValue(0);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (reduce) return;
    pop.value = 1;
    pop.value = withTiming(0, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [value]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.35 * pop.value }, { translateY: -6 * pop.value }],
    color: interpolateColor(pop.value, [0, 1], [colors.text, color]),
  }));
  return <Animated.Text style={[styles.scoreText, style]}>{value}</Animated.Text>;
}

/** Barra fina que se llena hasta la próxima actualización del modo espectador */
function RefreshBar({ stamp }) {
  const reduce = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(p);
    p.value = 0;
    if (!reduce) p.value = withTiming(1, { duration: LIVE_EVERY_MS, easing: Easing.linear });
  }, [stamp]);
  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: p.value }] }));
  return <View style={styles.refreshTrack}><Animated.View style={[styles.refreshFill, fill]} /></View>;
}

/** Cuánto hace que llegó el último marcador ("hace 12 s"), contado en vivo */
function UpdatedAgo({ at, t }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const s = Math.max(0, Math.round((now - at) / 1000));
  return <Text style={styles.updated}>{s < 5 ? t("val.updatedNow") : t("val.updatedAgo", { s })}</Text>;
}

/** Mapa que se está jugando: el borde late con el color de Valorant */
function MapCard({ index, game, a, b, t }) {
  const reduce = useReducedMotion();
  const live = game?.status === "running";
  const winA = game?.winnerId != null && game.winnerId === a?.id;
  const winB = game?.winnerId != null && game.winnerId === b?.id;
  const glow = useSharedValue(0);
  useEffect(() => {
    if (live && !reduce) glow.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1, true);
    else { cancelAnimation(glow); glow.value = 0; }
  }, [live]);
  const ring = useAnimatedStyle(() => ({ opacity: live ? 0.35 + 0.65 * glow.value : 0 }));
  const short = tm => tm?.acronym || tm?.name || "?";
  return (
    <Animated.View entering={reduce ? undefined : FadeInDown.delay(index * 70).duration(380)} style={[styles.map, winA && styles.mapA, winB && styles.mapB]}>
      <Animated.View pointerEvents="none" style={[styles.mapLive, ring]} />
      <Text style={[styles.mapLabel, live && { color: ACCENT }]}>{live ? t("val.mapLive", { n: index + 1 }) : t("val.map", { n: index + 1 })}</Text>
      <Text style={styles.mapWinner} numberOfLines={1}>{winA ? short(a) : winB ? short(b) : live ? "●" : "—"}</Text>
    </Animated.View>
  );
}

/** Lo último que pasó en el partido, armado con el estado de cada mapa (lo más nuevo arriba) */
function feedOf(match, t) {
  const [a, b] = match.teams;
  const name = id => (id === a?.id ? a : id === b?.id ? b : null)?.name || "?";
  const out = [];
  for (const g of [...match.games].sort((x, y) => x.position - y.position)) {
    if (g.status === "running") out.push({ key: `live-${g.position}`, text: t("val.feedMapLive", { n: g.position }), live: true });
    if (g.status === "finished" && g.winnerId != null) out.push({ key: `won-${g.position}`, text: t("val.feedMapWon", { team: name(g.winnerId), n: g.position }), side: g.winnerId === a?.id ? "a" : "b" });
  }
  if (match.status === "finished" && match.winnerId != null) out.push({ key: "end", text: t("val.feedWon", { team: name(match.winnerId) }), side: match.winnerId === a?.id ? "a" : "b", end: true });
  return out.reverse();
}

/** Seguir a un equipo: aviso 15 minutos antes de cada partido suyo (programado en el celular) */
function FollowPill({ team, list, t }) {
  const reduce = useReducedMotion();
  const following = isFollowingTeam(list, team?.id);
  const wiggle = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${wiggle.value * 14}deg` }] }));
  if (!team?.id) return null;

  async function toggle() {
    select();
    const { following: now } = await toggleFollowTeam(team);
    if (now) {
      success();
      if (!reduce) wiggle.value = withSequence(withTiming(1, { duration: 80 }), withTiming(-1, { duration: 110 }), withTiming(0.6, { duration: 100 }), withSpring(0));
      showHud(t("val.followed", { team: team.acronym || team.name }), "bell");
      if (Platform.OS !== "web" && (await getPermission()) === "undetermined") await requestPermission();
    }
    syncTeamAlerts().catch(() => {});
  }

  return (
    <PressableScale onPress={toggle} scaleTo={0.92} style={[styles.follow, following && styles.followOn]} accessibilityRole="button" accessibilityState={{ selected: following }}>
      <Animated.View style={style}><Icon name={following ? "bell" : "plus"} size={fontSizes.sm} color={following ? colors.onAccent : ACCENT} /></Animated.View>
      <Text style={[styles.followText, following && { color: colors.onAccent }]}>{following ? t("val.following") : t("val.follow")}</Text>
    </PressableScale>
  );
}

/**
 * Detalle de un partido de Valorant: los dos equipos con su marcador, quién ganó cada mapa (PandaScore gratis no da
 * el nombre del mapa), la fecha, el torneo y el enlace a la transmisión.
 * Mientras se juega es un modo espectador: el marcador se actualiza solo cada 30 s (con la pantalla abierta y la app
 * en primer plano), el mapa en juego late y "Lo último" cuenta qué pasó.
 *  - params: { id }
 */
export default function MatchScreen({ route, navigation }) {
  const t = useT();
  const reduce = useReducedMotion();
  const { id } = route.params;
  const [state, setState] = useState({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [stamp, setStamp] = useState(0);   // cuándo llegó el último marcador
  const [teams, setTeams] = useState([]);
  const alive = useRef(true);

  useEffect(() => {
    loadFollowedTeams().then(setTeams);
    return onFollowedTeamsChanged(setTeams);
  }, []);

  const load = useCallback(quiet => {
    if (!quiet) setState({ status: "loading" });
    return getMatch(id)
      .then(match => { if (alive.current) { setState({ status: "ready", match }); setStamp(Date.now()); } })
      .catch(e => { if (alive.current && !quiet) setState({ status: "error", message: errorMessage(e) }); });
  }, [id]);

  useEffect(() => {
    alive.current = true;
    load(false);
    return () => { alive.current = false; };
  }, [load, attempt]);

  const match = state.match;
  const live = match?.status === "running";
  useLayoutEffect(() => { if (match) navigation.setOptions({ title: stageLabel(match.stage, t) || match.tournament || "Valorant" }); }, [match]);

  // Modo espectador: solo con la pantalla a la vista y la app abierta
  useFocusEffect(useCallback(() => {
    if (!live) return undefined;
    const timer = setInterval(() => { if (AppState.currentState === "active") load(true); }, LIVE_EVERY_MS);
    return () => clearInterval(timer);
  }, [live, load]));

  if (state.status === "loading") {
    return <View style={[styles.container, styles.pad]}><Skeleton height={sizes.chart * 2} radius={radii.xl} style={styles.gap} /><Skeleton height={sizes.chart} radius={radii.lg} style={styles.gap} /></View>;
  }
  if (state.status === "error") return <View style={styles.center}><ErrorState message={state.message} onRetry={() => setAttempt(n => n + 1)} /></View>;

  const [a, b] = match.teams;
  const done = match.status === "finished";
  const isWinner = tm => done && match.winnerId != null && tm?.id === match.winnerId;
  const isFinal = /grand final/i.test(match.stage || "");
  const maps = Array.from({ length: match.bestOf || match.games.length || 0 }, (_, i) => match.games.find(g => g.position === i + 1) || null);
  const current = match.games.find(g => g.status === "running");
  const feed = live || done ? feedOf(match, t) : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <SplitGlow />
        <Text style={styles.stage} numberOfLines={1}>{[match.serie, match.tournament].filter(Boolean).join(" · ").toUpperCase()}</Text>
        <Text style={styles.sub}>{[stageLabel(match.stage, t), match.bestOf ? `BO${match.bestOf}` : null].filter(Boolean).join(" · ")}</Text>
        {live ? <View style={styles.liveTag}><LiveTag text={current ? `${t("wr.live")} · ${t("val.map", { n: current.position })}` : t("wr.live")} /></View> : null}
        <View style={styles.big}>
          {[a, b].map((tm, i) => (
            <View key={i} style={styles.team}>
              <View style={[styles.crestRing, isWinner(tm) && styles.crestWin]}><TeamCrest team={tm} size={sizes.avatarHero - spacing.xs} /></View>
              <Text style={styles.teamName} numberOfLines={2}>{tm?.name || t("val.tbd")}</Text>
              {done ? <Text style={[styles.teamTag, isWinner(tm) && { color: colors.gold }]}>{isWinner(tm) ? (isFinal ? `🏆 ${t("val.champ")}` : t("val.winner")) : isFinal ? t("val.runnerUp") : ""}</Text> : null}
              <FollowPill team={tm} list={teams} t={t} />
            </View>
          ))}
          <View style={styles.score} pointerEvents="none">
            {done || live
              ? <View style={styles.scoreRow}><ScoreNumber value={a?.score ?? 0} color={SIDE_A} /><Text style={[styles.scoreText, styles.colon]}>:</Text><ScoreNumber value={b?.score ?? 0} color={SIDE_B} /></View>
              : <Text style={styles.vsText}>VS</Text>}
          </View>
        </View>
        {live ? (
          <View style={styles.liveMeta}>
            <RefreshBar stamp={stamp} />
            <UpdatedAgo at={stamp} t={t} />
          </View>
        ) : null}
      </View>

      <View style={styles.pad}>
        {maps.length ? (
          <>
            <Text style={styles.section}>{t("val.mapByMap")}</Text>
            <View style={styles.maps}>
              {maps.map((g, i) => <MapCard key={i} index={i} game={g} a={a} b={b} t={t} />)}
            </View>
          </>
        ) : null}

        {feed.length ? (
          <>
            <Text style={[styles.section, styles.gapLg]}>{t("val.feed")}</Text>
            <Card padded={false}>
              {feed.map((e, i) => (
                <Animated.View
                  key={e.key}
                  entering={reduce ? undefined : FadeInDown.duration(360)}
                  layout={reduce ? undefined : LinearTransition.springify().damping(18)}
                  style={[styles.feedRow, i && styles.sep]}
                >
                  <View style={[styles.feedDot, { backgroundColor: e.live ? ACCENT : e.side === "a" ? SIDE_A : SIDE_B }, e.end && styles.feedDotEnd]} />
                  <Text style={[styles.feedText, e.end && styles.feedTextEnd]} numberOfLines={2}>{e.text}</Text>
                </Animated.View>
              ))}
            </Card>
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
        <Text style={styles.source}>{live ? t("val.liveSource") : t("val.source")}</Text>
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
  gapLg:     { marginTop: spacing.lg },
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
  scoreRow:  { flexDirection: "row", alignItems: "center" },
  scoreText: { ...type.largeTitle, fontSize: fontSizes.hero + spacing.md, color: colors.text, fontVariant: ["tabular-nums"] },
  colon:     { color: colors.textMuted, marginHorizontal: spacing.xxs },
  vsText:    { ...type.title, color: colors.textMuted },
  liveMeta:  { alignSelf: "stretch", marginTop: spacing.md, alignItems: "center", gap: spacing.xs },
  refreshTrack: { alignSelf: "stretch", height: sizes.hairline * 3, borderRadius: radii.pill, backgroundColor: withAlpha(colors.text, 0.08), overflow: "hidden" },
  refreshFill:  { height: "100%", width: "100%", backgroundColor: withAlpha(ACCENT, 0.8), transformOrigin: "left" },
  updated:   { ...type.micro, color: colors.textMuted },
  follow:    { flexDirection: "row", alignItems: "center", gap: spacing.xxs + 1, paddingHorizontal: spacing.sm + spacing.xxs, paddingVertical: spacing.xxs + 2, borderRadius: radii.pill, borderWidth: sizes.hairline * 1.5, borderColor: withAlpha(ACCENT, 0.7), marginTop: spacing.xxs },
  followOn:  { backgroundColor: ACCENT, borderColor: ACCENT },
  followText:{ ...type.micro, color: ACCENT, fontWeight: "700" },
  section:   { ...type.section, color: colors.text, marginBottom: spacing.sm },
  maps:      { flexDirection: "row", gap: spacing.xs },
  map:       { flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: radii.md, borderWidth: sizes.hairline, borderColor: colors.border, backgroundColor: colors.surface },
  mapA:      { borderColor: withAlpha(SIDE_A, 0.6), backgroundColor: withAlpha(SIDE_A, 0.12) },
  mapB:      { borderColor: withAlpha(SIDE_B, 0.6), backgroundColor: withAlpha(SIDE_B, 0.12) },
  mapLive:   { ...StyleSheet.absoluteFillObject, borderRadius: radii.md, borderWidth: sizes.borderThick, borderColor: ACCENT, backgroundColor: withAlpha(ACCENT, 0.1) },
  mapLabel:  { ...type.micro, color: colors.textMuted },
  mapWinner: { ...type.captionStrong, color: colors.text, marginTop: spacing.xxs },
  feedRow:   { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm + spacing.xxs, paddingHorizontal: spacing.md },
  feedDot:   { width: sizes.dot + 2, height: sizes.dot + 2, borderRadius: sizes.dot },
  feedDotEnd:{ backgroundColor: colors.gold },
  feedText:  { ...type.caption, color: colors.text, flex: 1 },
  feedTextEnd: { ...type.captionStrong, color: colors.gold },
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
