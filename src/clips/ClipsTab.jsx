import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Image, ScrollView, StyleSheet } from "react-native";
import Animated, { Easing, FadeInRight, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { ErrorState, PressableScale } from "../components/ui";
import { getGameMeta } from "../games/registry";
import { ChipLogo, GamePill, Rail, Shade } from "../news/components";
import { GoldSkeleton, PillChips, PressCard, Shine } from "../news/fx";
import { getClips, hasWebView } from "./api";
import { useT } from "../i18n/I18nProvider";
import { errorMessage, formatCompact } from "../utils/format";
import { accents, colors, radii, sizes, spacing, type, withAlpha } from "../theme";

const WEEK = 7 * 24 * 60 * 60 * 1000;

/** Las tres portadas en abanico; la del medio flota despacio */
function Stack({ clips, onOpen }) {
  const reduce = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => { if (!reduce) y.value = withRepeat(withSequence(withTiming(-spacing.sm, { duration: 2000, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.quad) })), -1); }, [reduce]);
  const float = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const pulse = useSharedValue(1);
  useEffect(() => { if (!reduce) pulse.value = withRepeat(withSequence(withTiming(1.08, { duration: 900 }), withTiming(1, { duration: 900 })), -1); }, [reduce]);
  const playStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const [left, mid, right] = clips;
  if (!mid) return null;
  return (
    <View style={styles.stack}>
      {left ? <Image source={{ uri: left.image }} style={[styles.side, styles.left]} /> : null}
      {right ? <Image source={{ uri: right.image }} style={[styles.side, styles.right]} /> : null}
      <Animated.View style={[styles.mid, float]}>
        <PressCard onPress={() => onOpen(mid)} style={styles.midCard} label={mid.title}>
          <Image source={{ uri: mid.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <Shade from={0} mid={0.2} to={0.92} />
          <Animated.View style={[styles.play, playStyle]}><Text style={styles.playText}>▶</Text></Animated.View>
          <View style={styles.midBody}>
            <GamePill game={mid.game} solid />
            <Text style={styles.midTitle} numberOfLines={2}>{mid.title}</Text>
          </View>
        </PressCard>
      </Animated.View>
    </View>
  );
}

/**
 * Pestaña Clips de Explorar: portada con tres clips, el botón para abrir el visor a pantalla completa, filtro por juego
 * y lo más visto de la semana. Los clips son los Shorts oficiales de YouTube de cada juego.
 *  - visible, onOpen({ startId?, game? })
 */
export default function ClipsTab({ visible, onOpen }) {
  const t = useT();
  const [state, setState] = useState({ status: "loading" });
  const [game, setGame] = useState("all");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!visible) return undefined;
    let alive = true;
    getClips(attempt > 0).then(items => { if (alive) setState({ status: "ready", items }); }).catch(e => { if (alive) setState({ status: "error", message: errorMessage(e) }); });
    return () => { alive = false; };
  }, [visible, attempt]);

  const all = state.items || [];
  const mine = useMemo(() => all.filter(c => game === "all" || c.game === game), [all, game]);
  const top = useMemo(() => mine.filter(c => c.date && Date.now() - new Date(c.date).getTime() < WEEK).sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10), [mine]);
  const games = useMemo(() => [...new Set(all.map(c => c.game))], [all]);

  if (state.status === "loading") {
    return <View><GoldSkeleton height={sizes.chart * 2.7} radius={radii.xl} /><GoldSkeleton height={sizes.avatarLg + spacing.sm} style={styles.gap} /></View>;
  }
  if (state.status === "error") return <ErrorState message={state.message} onRetry={() => setAttempt(n => n + 1)} />;

  const open = clip => onOpen({ startId: clip?.id, game: game === "all" ? undefined : game });
  return (
    <View>
      <Stack clips={[mine[1], mine[0], mine[2]].filter(Boolean)} onOpen={open} />
      <PressableScale onPress={() => open(mine[0])} haptic scaleTo={0.97} style={styles.big} accessibilityRole="button">
        <Text style={styles.bigText}>▶  {t("clips.watch")}</Text>
        <Shine />
      </PressableScale>
      {!hasWebView() ? <Text style={styles.note}>{t("clips.needsUpdate")}</Text> : null}

      <PillChips
        style={styles.chips}
        value={game}
        onChange={setGame}
        items={[{ key: "all", label: t("clips.forYou"), accent: accents.valorant }, ...games.map(g => ({ key: g, label: getGameMeta(g)?.short || g, icon: <ChipLogo game={g} />, accent: getGameMeta(g)?.accent }))]}
      />

      {top.length ? (
        <Rail title={t("clips.topWeek")}>
          {top.map((c, i) => (
            <Animated.View key={c.id} entering={FadeInRight.delay(i * 60).duration(360)}>
              <PressCard onPress={() => open(c)} style={styles.mini} label={c.title}>
                <Image source={{ uri: c.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                <Shade from={0} mid={0.2} to={0.9} />
                <GamePill game={c.game} solid style={styles.miniPill} />
                <Text style={styles.miniViews}>▶ {formatCompact(c.views)}</Text>
              </PressCard>
            </Animated.View>
          ))}
        </Rail>
      ) : null}
      <Text style={styles.source}>{t("clips.source")}</Text>
    </View>
  );
}

const W = sizes.chart * 1.45;
const styles = StyleSheet.create({
  gap:       { marginTop: spacing.md },
  stack:     { height: W * 1.85, alignItems: "center", justifyContent: "flex-start" },
  side:      { position: "absolute", top: spacing.md, width: W * 0.92, height: W * 1.65, borderRadius: radii.xl, opacity: 0.6 },
  left:      { left: spacing.xs, transform: [{ rotate: "-7deg" }] },
  right:     { right: spacing.xs, transform: [{ rotate: "7deg" }] },
  mid:       { width: W, height: W * 1.78 },
  midCard:   { width: W, height: W * 1.78, borderRadius: radii.xl, overflow: "hidden", justifyContent: "flex-end", backgroundColor: colors.surfaceRaised, boxShadow: `0 18px 36px ${withAlpha("#000", 0.55)}` },
  play:      { position: "absolute", top: "38%", alignSelf: "center", width: sizes.avatarHero * 0.72, height: sizes.avatarHero * 0.72, borderRadius: sizes.avatarHero, alignItems: "center", justifyContent: "center", backgroundColor: withAlpha(colors.text, 0.18), borderWidth: sizes.hairline, borderColor: withAlpha(colors.text, 0.45) },
  playText:  { ...type.title, color: colors.text },
  midBody:   { padding: spacing.md, gap: spacing.xs },
  midTitle:  { ...type.smallStrong, color: colors.text },
  big:       { alignItems: "center", justifyContent: "center", height: sizes.avatarLg + spacing.md, borderRadius: radii.lg, overflow: "hidden", backgroundColor: accents.valorant, boxShadow: `0 10px 26px ${withAlpha(accents.valorant, 0.35)}` },
  bigText:   { ...type.heading, color: colors.onAccent },
  note:      { ...type.micro, color: colors.textMuted, textAlign: "center", marginTop: spacing.sm },
  chips:     { marginTop: spacing.md },
  mini:      { width: sizes.chart * 0.8, height: sizes.chart * 1.42, borderRadius: radii.lg, overflow: "hidden", justifyContent: "flex-end", padding: spacing.xs, backgroundColor: colors.surfaceRaised },
  miniPill:  { position: "absolute", top: spacing.xs, left: spacing.xs },
  miniViews: { ...type.micro, color: colors.text },
  source:    { ...type.micro, color: colors.textMuted, marginTop: spacing.lg },
});
