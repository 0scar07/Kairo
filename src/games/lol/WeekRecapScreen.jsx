import React, { useEffect, useRef, useState } from "react";
import { View, Text, Image, Pressable, Platform, Alert, ActivityIndicator, StyleSheet, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";
import Animated, {
  Easing, FadeIn, FadeInDown, FadeInUp, ZoomIn, cancelAnimation, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming,
} from "react-native-reanimated";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { CountUp, PressableScale } from "../../components/ui";
import Icon from "../../components/Icon";
import { KenBurnsImage } from "../../news/fx";
import { championIcon, championLabel, championSplash } from "../../api/ddragon";
import { activeLanguage } from "../../i18n";
import { useT } from "../../i18n/I18nProvider";
import { errorMessage, formatNumber } from "../../utils/format";
import { select } from "../../utils/haptics";
import { accents, colors, fonts, radii, sizes, spacing, tracking, withAlpha } from "../../theme";

const ACCENT = accents.lol;
const PAGE_MS = 5500;
const PAGES = 4;
const ROLES = { TOP: "lol.role.top", JUNGLE: "lol.role.jungle", MIDDLE: "lol.role.mid", BOTTOM: "lol.role.bot", UTILITY: "lol.role.support" };

const fmtRange = (from, to) => {
  const o = { day: "numeric", month: "short" };
  return `${new Date(from).toLocaleDateString(activeLanguage(), o)} – ${new Date(to).toLocaleDateString(activeLanguage(), o)}`;
};

/** Fondo de cada página: degradado con el color de LoL y, si hay, el arte del campeón con movimiento lento */
function Backdrop({ splash, active, tint = ACCENT }) {
  return (
    <>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="recapGlow" cx="75%" cy="18%" r="80%">
            <Stop offset="0" stopColor={tint} stopOpacity="0.42" />
            <Stop offset="1" stopColor={colors.bg} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="recapMint" cx="10%" cy="92%" r="60%">
            <Stop offset="0" stopColor={accents.brand} stopOpacity="0.18" />
            <Stop offset="1" stopColor={colors.bg} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={colors.bg} />
        <Rect width="100%" height="100%" fill="url(#recapGlow)" />
        <Rect width="100%" height="100%" fill="url(#recapMint)" />
      </Svg>
      {splash ? (
        <View style={StyleSheet.absoluteFill}>
          <KenBurnsImage uri={splash} active={active} style={styles.splash} />
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
            <Defs>
              <LinearGradient id="recapShade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.bg} stopOpacity="0.55" />
                <Stop offset="0.35" stopColor={colors.bg} stopOpacity="0.1" />
                <Stop offset="0.7" stopColor={colors.bg} stopOpacity="0.85" />
                <Stop offset="1" stopColor={colors.bg} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#recapShade)" />
          </Svg>
        </View>
      ) : null}
    </>
  );
}

const Brand = () => (
  <View style={styles.brand}><View style={styles.brandMark} /><Text style={styles.brandText}>KAIRO</Text></View>
);

function Stat({ value, label, color = colors.text, delay, reduce }) {
  return (
    <Animated.View entering={reduce ? undefined : FadeInUp.delay(delay).duration(420)} style={styles.stat}>
      <Text style={[styles.statValue, { color }]} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    </Animated.View>
  );
}

/** Las 4 páginas: tu semana, tu campeón, tu mejor partida y el resumen */
function Page({ index, recap, name, tier, t, reduce }) {
  const { top, best } = recap;
  const d = i => (reduce ? undefined : FadeInDown.delay(150 + i * 120).duration(480));
  const lpText = recap.lp == null ? null : recap.lp > 0 ? `+${recap.lp}` : String(recap.lp);

  if (index === 0) {
    return (
      <View style={styles.page}>
        <Backdrop />
        <Animated.Text entering={d(0)} style={styles.kicker}>{t("recap.kicker")}</Animated.Text>
        <Animated.Text entering={d(1)} style={styles.range}>{fmtRange(recap.from, recap.to)}</Animated.Text>
        <Animated.Text entering={d(2)} style={styles.who} numberOfLines={1}>{name}</Animated.Text>
        <View style={styles.flex} />
        <Animated.View entering={reduce ? undefined : ZoomIn.delay(500).springify().damping(12)}>
          {lpText != null
            ? <CountUp value={recap.lp} delay={650} duration={1200} format={v => `${v > 0 ? "+" : ""}${v} LP`} style={[styles.huge, { color: recap.lp >= 0 ? colors.text : colors.loss }]} />
            : <CountUp value={recap.games} delay={650} duration={1000} style={styles.huge} />}
        </Animated.View>
        <Animated.Text entering={d(6)} style={styles.hugeSub}>{lpText != null ? (tier || t("recap.lpWeek")) : t("recap.gamesWeek")}</Animated.Text>
        <View style={styles.flex} />
        <Brand />
      </View>
    );
  }
  if (index === 1) {
    return (
      <View style={styles.page}>
        <Backdrop splash={championSplash(top.name)} active />
        <Animated.Text entering={d(0)} style={styles.kicker}>{t("recap.champKicker")}</Animated.Text>
        <View style={styles.flex} />
        <Animated.Text entering={d(1)} style={styles.champName} numberOfLines={1} adjustsFontSizeToFit>{championLabel(top.name)}</Animated.Text>
        <View style={styles.statsRow}>
          <Stat value={String(top.games)} label={t("recap.games")} delay={500} reduce={reduce} />
          <Stat value={`${top.wr} %`} label={t("recap.wins")} color={top.wr >= 50 ? colors.win : colors.loss} delay={620} reduce={reduce} />
          <Stat value={top.kda.toFixed(1)} label="KDA" color={colors.gold} delay={740} reduce={reduce} />
        </View>
        <Brand />
      </View>
    );
  }
  if (index === 2) {
    return (
      <View style={styles.page}>
        <Backdrop splash={championSplash(best.champion)} active tint={best.win ? colors.win : colors.loss} />
        <Animated.Text entering={d(0)} style={styles.kicker}>{t("recap.bestKicker")}</Animated.Text>
        <View style={styles.flex} />
        <Animated.View entering={reduce ? undefined : ZoomIn.delay(300).springify().damping(13)} style={styles.bestIconWrap}>
          <Image source={{ uri: championIcon(best.champion) }} style={styles.bestIcon} />
        </Animated.View>
        <Animated.Text entering={d(2)} style={styles.kda}>{best.kills}<Text style={styles.slash}>/</Text>{best.deaths}<Text style={styles.slash}>/</Text>{best.assists}</Animated.Text>
        <Animated.Text entering={d(3)} style={[styles.result, { color: best.win ? colors.win : colors.loss }]}>{best.win ? t("recap.victory") : t("recap.defeat")} · {championLabel(best.champion)}</Animated.Text>
        <View style={styles.statsRow}>
          <Stat value={formatNumber(best.damage)} label={t("recap.damage")} delay={650} reduce={reduce} />
          <Stat value={String(best.cs)} label="CS" delay={770} reduce={reduce} />
          <Stat value={`${Math.round(best.minutes)} min`} label={t("recap.duration")} delay={890} reduce={reduce} />
        </View>
        <Brand />
      </View>
    );
  }
  return (
    <View style={styles.page}>
      <Backdrop tint={accents.brand} />
      <Animated.Text entering={d(0)} style={styles.kicker}>{t("recap.summaryKicker")}</Animated.Text>
      <Animated.Text entering={d(1)} style={styles.summaryTitle}>{t("recap.summaryTitle")}</Animated.Text>
      <View style={styles.grid}>
        {[
          [String(recap.games), t("recap.games"), colors.text],
          [`${recap.wr} %`, t("recap.wins"), recap.wr >= 50 ? colors.win : colors.loss],
          [String(recap.streak), t("recap.streak"), colors.gold],
          [recap.role && ROLES[recap.role] ? t(ROLES[recap.role]) : "—", t("recap.role"), colors.text],
        ].map(([v, l, c], i) => (
          <Animated.View key={l} entering={reduce ? undefined : ZoomIn.delay(350 + i * 110).springify().damping(14)} style={styles.tile}>
            <Text style={[styles.tileValue, { color: c }]} numberOfLines={1} adjustsFontSizeToFit>{v}</Text>
            <Text style={styles.tileLabel}>{l}</Text>
          </Animated.View>
        ))}
        <Animated.View entering={reduce ? undefined : FadeInUp.delay(800).duration(420)} style={[styles.tile, styles.tileWide]}>
          <Image source={{ uri: championIcon(top.name) }} style={styles.tileIcon} />
          <View style={styles.flex}>
            <Text style={styles.tileChamp} numberOfLines={1}>{championLabel(top.name)}</Text>
            <Text style={styles.tileLabel}>{t("recap.mainLine", { games: top.games, kda: top.kda.toFixed(1) })}</Text>
          </View>
        </Animated.View>
      </View>
      <View style={styles.flex} />
      <Brand />
    </View>
  );
}

/**
 * "Tu semana en LoL": resumen tipo Wrapped en 4 páginas que se pasan solas como historias (tocar a la derecha o a la
 * izquierda salta, mantener pausa). Se puede compartir la página que se ve como imagen 9:16.
 *  - params: { recap (week.js → weekRecap), name, tier }
 */
export default function WeekRecapScreen({ route, navigation }) {
  const t = useT();
  const reduce = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { recap, name, tier } = route.params;
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);
  const progress = useSharedValue(0);
  const paused = useRef(false);

  const go = next => {
    if (next < 0) next = 0;
    if (next >= PAGES) { navigation.goBack(); return; }
    select();
    setPage(next);
  };

  // Avance automático de la página actual (la barra de arriba se llena y pasa a la siguiente)
  useEffect(() => {
    cancelAnimation(progress);
    progress.value = 0;
    progress.value = withTiming(1, { duration: PAGE_MS, easing: Easing.linear }, done => { if (done) runOnJS(go)(page + 1); });
  }, [page]);

  const hold = on => {
    paused.current = on;
    if (on) cancelAnimation(progress);
    else progress.value = withTiming(1, { duration: PAGE_MS * (1 - progress.value), easing: Easing.linear }, done => { if (done) runOnJS(go)(page + 1); });
  };

  async function share() {
    if (busy) return;
    setBusy(true);
    hold(true);
    try {
      if (!(await Sharing.isAvailableAsync())) throw new Error(t("share.unavailable"));
      await new Promise(r => setTimeout(r, 400));
      const uri = await captureRef(ref, { format: "png", quality: 1, result: "tmpfile", width: 1080, height: Math.round(1080 * (height / width)) });
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: t("share.title") });
    } catch (e) {
      Alert.alert(t("common.error"), t("share.error", { error: errorMessage(e) }));
    } finally {
      setBusy(false);
      hold(false);
    }
  }

  return (
    <View style={styles.container}>
      <View ref={ref} collapsable={false} style={StyleSheet.absoluteFill}>
        <Animated.View key={page} entering={reduce ? FadeIn.duration(150) : FadeIn.duration(380)} style={StyleSheet.absoluteFill}>
          <View style={[styles.safe, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl }]}>
            <Page index={page} recap={recap} name={name} tier={tier} t={t} reduce={reduce} />
          </View>
        </Animated.View>
      </View>

      {/* Zonas de toque: izquierda vuelve, derecha avanza, mantener pausa */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={styles.touchRow}>
          <Pressable style={styles.touchLeft} onPress={() => go(page - 1)} onLongPress={() => hold(true)} onPressOut={() => paused.current && hold(false)} delayLongPress={220} accessibilityRole="button" accessibilityLabel={t("recap.prev")} />
          <Pressable style={styles.touchRight} onPress={() => go(page + 1)} onLongPress={() => hold(true)} onPressOut={() => paused.current && hold(false)} delayLongPress={220} accessibilityRole="button" accessibilityLabel={t("recap.next")} />
        </View>
      </View>

      <View style={[styles.top, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
        <View style={styles.bars}>
          {Array.from({ length: PAGES }, (_, i) => <Bar key={i} state={i < page ? "done" : i === page ? "now" : "next"} progress={progress} />)}
        </View>
        <PressableScale onPress={() => navigation.goBack()} haptic scaleTo={0.85} hitSlop={spacing.md} style={styles.close} accessibilityRole="button" accessibilityLabel={t("common.close")}>
          <Icon name="close" size={sizes.item - spacing.xs} color={colors.text} />
        </PressableScale>
      </View>

      {Platform.OS !== "web" ? (
        <PressableScale onPress={share} haptic scaleTo={0.95} disabled={busy} style={[styles.share, { bottom: insets.bottom + spacing.xl }]} accessibilityRole="button">
          {busy ? <ActivityIndicator size="small" color={colors.bg} /> : <Icon name="share" size={sizes.item - spacing.sm} color={colors.bg} />}
          <Text style={styles.shareText}>{t("recap.share")}</Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

function Bar({ state, progress }) {
  const fill = useAnimatedStyle(() => ({ width: `${(state === "done" ? 1 : state === "now" ? progress.value : 0) * 100}%` }));
  return <View style={styles.bar}><Animated.View style={[styles.barFill, fill]} /></View>;
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg },
  safe:        { flex: 1 },
  page:        { flex: 1, paddingHorizontal: spacing.xl },
  flex:        { flex: 1 },
  splash:      { opacity: 0.9 },
  kicker:      { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 3.2, color: ACCENT, marginTop: spacing.lg },
  range:       { fontFamily: fonts.displayHeavy, fontSize: 40, lineHeight: 44, color: colors.text, marginTop: spacing.sm, letterSpacing: tracking.tighter },
  who:         { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.textSecondary, marginTop: spacing.sm },
  huge:        { fontFamily: fonts.displayHeavy, fontSize: 76, lineHeight: 84, color: colors.text, letterSpacing: -2 },
  hugeSub:     { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.textSecondary, marginTop: spacing.xs },
  champName:   { fontFamily: fonts.displayHeavy, fontSize: 56, lineHeight: 62, color: colors.text, letterSpacing: -1.5 },
  statsRow:    { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.xxl },
  stat:        { flex: 1, padding: spacing.md, borderRadius: radii.lg, backgroundColor: withAlpha(colors.surfaceRaised, 0.82), borderWidth: sizes.hairline, borderColor: withAlpha(colors.text, 0.08) },
  statValue:   { fontFamily: fonts.displayHeavy, fontSize: 22 },
  statLabel:   { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary, marginTop: spacing.xxs },
  bestIconWrap:{ alignSelf: "flex-start", borderRadius: radii.xl, padding: spacing.xxs + 1, backgroundColor: withAlpha(colors.text, 0.15) },
  bestIcon:    { width: sizes.iconHero, height: sizes.iconHero, borderRadius: radii.xl - 2 },
  kda:         { fontFamily: fonts.displayHeavy, fontSize: 64, lineHeight: 70, color: colors.text, marginTop: spacing.md, letterSpacing: -1.5 },
  slash:       { color: colors.textMuted },
  result:      { fontFamily: fonts.bodyBold, fontSize: 15 },
  summaryTitle:{ fontFamily: fonts.displayHeavy, fontSize: 34, lineHeight: 38, color: colors.text, marginTop: spacing.sm },
  grid:        { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xl },
  tile:        { width: "48.5%", padding: spacing.lg, borderRadius: radii.xl, backgroundColor: withAlpha(colors.surfaceRaised, 0.85), borderWidth: sizes.hairline, borderColor: withAlpha(colors.text, 0.07) },
  tileWide:    { width: "100%", flexDirection: "row", alignItems: "center", gap: spacing.md },
  tileValue:   { fontFamily: fonts.displayHeavy, fontSize: 28 },
  tileLabel:   { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary, marginTop: spacing.xxs },
  tileIcon:    { width: sizes.avatarHero - spacing.lg, height: sizes.avatarHero - spacing.lg, borderRadius: radii.lg },
  tileChamp:   { fontFamily: fonts.displayHeavy, fontSize: 22, color: colors.text },
  brand:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginBottom: sizes.button + spacing.md },
  brandMark:   { width: spacing.lg + spacing.xs, height: spacing.lg + spacing.xs, borderRadius: radii.sm, backgroundColor: accents.brand },
  brandText:   { fontFamily: fonts.displayHeavy, fontSize: 15, letterSpacing: tracking.brand - 2, color: colors.text },
  touchRow:    { flex: 1, flexDirection: "row" },
  touchLeft:   { width: "33%" },
  touchRight:  { flex: 1 },
  top:         { position: "absolute", left: spacing.lg, right: spacing.lg, flexDirection: "row", alignItems: "center", gap: spacing.md },
  bars:        { flex: 1, flexDirection: "row", gap: spacing.xs },
  bar:         { flex: 1, height: sizes.barThin, borderRadius: radii.pill, backgroundColor: withAlpha(colors.text, 0.25), overflow: "hidden" },
  barFill:     { height: "100%", backgroundColor: colors.text },
  close:       { width: sizes.avatarMd, height: sizes.avatarMd, borderRadius: radii.pill, alignItems: "center", justifyContent: "center", backgroundColor: withAlpha(colors.bg, 0.5) },
  share:       { position: "absolute", alignSelf: "center", flexDirection: "row", alignItems: "center", gap: spacing.sm, height: sizes.button - spacing.xs, paddingHorizontal: spacing.xl, borderRadius: radii.pill, backgroundColor: colors.text },
  shareText:   { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.bg },
});
