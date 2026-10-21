import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import Animated, {
  Easing, LinearTransition, ZoomIn, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming,
} from "react-native-reanimated";
import Icon from "../../../components/Icon";
import { Chip, Confetti, CountUp, PressableScale, Sheet, showHud } from "../../../components/ui";
import { useT } from "../../../i18n/I18nProvider";
import { activeLanguage } from "../../../i18n";
import { select, success } from "../../../utils/haptics";
import {
  GOAL_OPTIONS, gamesSince, goalProgress, loadWeekState, lpChange, markDone, rankScore, recordSnapshot, saveGoals, weekDays, weekStart,
} from "../week";
import { accents, colors, radii, sizes, spacing, type, withAlpha } from "../../../theme";

const ACCENT = accents.lol;
const GOAL_ICON = { lp: "trending", wins: "trophy", kda: "zap" };

// Letra de cada día de la semana en el idioma de la app (L M X J V S D)
const dayLetters = () => Array.from({ length: 7 }, (_, i) => new Date(2026, 9, 19 + i).toLocaleDateString(activeLanguage(), { weekday: "narrow" }).toUpperCase());

/** Barra del objetivo: se llena con un brillo que la recorre, y late cuando el objetivo está cumplido */
function GoalBar({ pct, done, height = sizes.bar * 2.5 }) {
  const reduce = useReducedMotion();
  const fill = useSharedValue(0);
  const shine = useSharedValue(-1);
  useEffect(() => {
    fill.value = withDelay(250, withTiming(pct, { duration: 1100, easing: Easing.out(Easing.cubic) }));
    if (!reduce) shine.value = withDelay(1300, withRepeat(withSequence(withTiming(1.4, { duration: 1400, easing: Easing.inOut(Easing.quad) }), withTiming(-1, { duration: 0 }), withDelay(2600, withTiming(-1, { duration: 0 }))), -1));
  }, [pct]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${Math.max(fill.value * 100, fill.value > 0 ? 4 : 0)}%` }));
  const shineStyle = useAnimatedStyle(() => ({ left: `${shine.value * 100 - 60}%` }));
  const color = done ? colors.win : ACCENT;
  return (
    <View style={[styles.track, { height, borderRadius: height }]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}>
      <Animated.View style={[styles.fill, { backgroundColor: color, borderRadius: height, boxShadow: `0 0 14px ${withAlpha(color, 0.55)}` }, fillStyle]}>
        <Animated.View style={[styles.shine, shineStyle]}>
          <Svg width="100%" height="100%" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="goalShine" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
                <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.55" />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#goalShine)" />
          </Svg>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function Days({ days }) {
  const reduce = useReducedMotion();
  const letters = useMemo(dayLetters, []);
  return (
    <View style={styles.days}>
      {days.map((d, i) => (
        <View key={i} style={styles.day}>
          <Animated.View entering={reduce ? undefined : ZoomIn.delay(400 + i * 70).springify().damping(14)} style={[styles.dayBox, styles[`day_${d}`]]} />
          <Text style={styles.dayLetter}>{letters[i]}</Text>
        </View>
      ))}
    </View>
  );
}

/** Título y detalle de un objetivo en el idioma de la app */
function describe(g, t) {
  if (g.id === "lp") return { title: t("week.goal.lp", { n: g.target }), unit: t("week.ofLp", { n: g.target }), value: g.value > 0 ? `+${g.value}` : String(g.value) };
  if (g.id === "wins") return { title: t("week.goal.wins", { n: g.target, of: g.of }), unit: t("week.ofWins", { n: g.target, played: g.played, of: g.of }), value: String(g.value) };
  return { title: t("week.goal.kda", { n: g.target }), unit: g.played < 3 ? t("week.kdaMin") : t("week.ofKda", { n: g.target, played: g.played }), value: g.played ? g.value.toFixed(1) : "—" };
}

function OtherGoal({ g, onPress, t }) {
  const d = describe(g, t);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.other, pressed && styles.pressed]} accessibilityRole="button" accessibilityHint={t("week.feature")}>
      <View style={[styles.otherIcon, g.done && { backgroundColor: withAlpha(colors.win, 0.15) }]}>
        <Icon name={g.done ? "check" : GOAL_ICON[g.id]} size={sizes.item - spacing.sm} color={g.done ? colors.win : ACCENT} />
      </View>
      <View style={styles.otherBody}>
        <View style={styles.otherHead}>
          <Text style={styles.otherTitle} numberOfLines={1}>{d.title}</Text>
          <Text style={[styles.otherValue, g.done && { color: colors.win }]}>{d.value}{g.id === "wins" ? ` / ${g.target}` : ""}</Text>
        </View>
        <GoalBar pct={g.pct} done={g.done} height={sizes.bar + spacing.xxs} />
      </View>
    </Pressable>
  );
}

/**
 * Objetivo de la semana en Mi perfil (LoL): el destacado arriba con su barra, los días jugados de lunes a domingo y los
 * otros dos objetivos debajo (tocar uno lo destaca). Al cumplirse sale confeti una sola vez por semana.
 * Los LP salen de las fotos diarias que guarda la app (week.js); las victorias y el KDA, de las partidas cargadas.
 */
export default function WeeklyGoal({ data }) {
  const t = useT();
  const reduce = useReducedMotion();
  const { account, ranked, matches } = data;
  const solo = ranked?.find(r => r.queueType === "RANKED_SOLO_5x5") || null;
  const [state, setState] = useState(null);
  const [editing, setEditing] = useState(false);
  const [burst, setBurst] = useState(0);

  const refresh = useCallback(async () => {
    await recordSnapshot(account.puuid, solo).catch(() => {});
    setState(await loadWeekState(account.puuid));
  }, [account.puuid, solo?.tier, solo?.rank, solo?.leaguePoints]);
  useEffect(() => { refresh(); }, [refresh]);

  const start = weekStart();
  const games = useMemo(() => gamesSince(matches, account.puuid, start), [matches, start]);
  const goals = state?.goals;
  const lp = state ? lpChange(state.snaps, start, rankScore(solo)) : null;
  const all = goals ? ["lp", "wins", "kda"].map(id => goalProgress(id, goals, { lp, games })) : [];
  const main = all.find(g => g.id === goals?.featured) || all[0];
  const others = all.filter(g => g !== main);
  const week = new Date(start).toISOString().slice(0, 10);

  // Confeti la primera vez que el objetivo destacado se cumple esta semana
  useEffect(() => {
    if (!main?.done) return;
    markDone(account.puuid, week, main.id).then(first => {
      if (!first) return;
      success();
      setBurst(n => n + 1);
      showHud(t("week.doneHud", { goal: describe(main, t).title }), "trophy");
    }).catch(() => {});
  }, [main?.id, main?.done]);

  if (!state || !main) return null;
  const d = describe(main, t);
  const left = 7 - Math.floor((Date.now() - start) / 86_400_000) - 1;
  const firstWeek = state.snaps.every(s => s.day >= week);

  async function feature(id) {
    select();
    const next = { ...goals, featured: id };
    setState(s => ({ ...s, goals: next }));
    await saveGoals(next);
  }
  async function setGoal(patch) {
    select();
    const next = { ...goals, ...patch };
    setState(s => ({ ...s, goals: next }));
    await saveGoals(next);
  }

  return (
    <View style={styles.card}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <LinearGradient id="goalGlow" x1="0" y1="0" x2="0.9" y2="1">
            <Stop offset="0" stopColor={main.done ? colors.win : ACCENT} stopOpacity="0.22" />
            <Stop offset="0.6" stopColor={colors.surface} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#goalGlow)" />
      </Svg>
      <Confetti fire={burst} />

      <View style={styles.head}>
        <View style={[styles.badge, main.done && styles.badgeDone]}>
          <Text style={[styles.badgeText, main.done && { color: colors.win }]}>{main.done ? t("week.done") : t("week.goalBadge")}</Text>
        </View>
        <Text style={styles.left}>{main.failed ? t("week.failed") : left <= 0 ? t("week.lastDay") : t("week.daysLeft", { count: left })}</Text>
        <PressableScale onPress={() => setEditing(true)} haptic scaleTo={0.85} hitSlop={spacing.sm} accessibilityRole="button" accessibilityLabel={t("week.edit")}>
          <Icon name="edit" size={sizes.item - spacing.sm} color={colors.textMuted} />
        </PressableScale>
      </View>

      <Animated.View key={main.id} entering={reduce ? undefined : ZoomIn.duration(320)} layout={reduce ? undefined : LinearTransition.springify().damping(18)}>
        <Text style={styles.title}>{d.title}</Text>
        <View style={styles.valueRow}>
          {main.id === "kda"
            ? <Text style={[styles.value, main.done && { color: colors.win }]}>{d.value}</Text>
            : <CountUp value={main.value} format={v => (main.id === "lp" && v > 0 ? `+${v}` : String(v))} style={[styles.value, main.done && { color: colors.win }]} />}
          <Text style={styles.unit} numberOfLines={1}>{main.id === "lp" && main.unknown ? t("week.lpUnknown") : d.unit}</Text>
          <Text style={styles.pct}>{Math.round(main.pct * 100)} %</Text>
        </View>
        <GoalBar pct={main.pct} done={main.done} />
        {main.id === "lp" && firstWeek && !main.unknown ? <Text style={styles.hint}>{t("week.lpSince")}</Text> : null}
      </Animated.View>

      <Days days={weekDays(games, start)} />

      <Text style={styles.othersLabel}>{t("week.others")}</Text>
      {others.map(g => (
        <Animated.View key={g.id} layout={reduce ? undefined : LinearTransition.springify().damping(18)}>
          <OtherGoal g={g} t={t} onPress={() => feature(g.id)} />
        </Animated.View>
      ))}

      <Sheet visible={editing} onClose={() => setEditing(false)} title={t("week.editTitle")}>
        {[
          ["lp", t("week.editLp"), GOAL_OPTIONS.lp.map(n => [n, `+${n} LP`]), n => setGoal({ lp: n }), goals.lp],
          ["wins", t("week.editWins", { of: goals.winsOf }), GOAL_OPTIONS.wins.map(n => [n, String(n)]), n => setGoal({ wins: n }), goals.wins],
          ["kda", t("week.editKda"), GOAL_OPTIONS.kda.map(n => [n, n.toFixed(1)]), n => setGoal({ kda: n }), goals.kda],
        ].map(([id, label, options, onPick, current]) => (
          <View key={id} style={styles.editRow}>
            <View style={styles.editHead}>
              <Icon name={GOAL_ICON[id]} size={sizes.item - spacing.sm} color={ACCENT} />
              <Text style={styles.editLabel}>{label}</Text>
              <PressableScale onPress={() => feature(id)} scaleTo={0.92} style={[styles.featureBtn, goals.featured === id && styles.featureOn]} accessibilityRole="button" accessibilityState={{ selected: goals.featured === id }}>
                <Text style={[styles.featureText, goals.featured === id && { color: colors.onAccent }]}>{goals.featured === id ? t("week.featured") : t("week.feature")}</Text>
              </PressableScale>
            </View>
            <View style={styles.chips}>
              {options.map(([n, text]) => <Chip key={n} label={text} game="lol" active={current === n} onPress={() => onPick(n)} />)}
            </View>
          </View>
        ))}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  card:       { overflow: "hidden", padding: spacing.lg, borderRadius: radii.xl, backgroundColor: colors.surface, borderWidth: sizes.hairline, borderColor: withAlpha(ACCENT, 0.45), marginBottom: spacing.lg },
  head:       { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  badge:      { paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs + 1, borderRadius: radii.pill, backgroundColor: withAlpha(ACCENT, 0.12), borderWidth: sizes.hairline, borderColor: withAlpha(ACCENT, 0.4) },
  badgeDone:  { backgroundColor: withAlpha(colors.win, 0.12), borderColor: withAlpha(colors.win, 0.4) },
  badgeText:  { ...type.micro, color: ACCENT, letterSpacing: 0.6, fontWeight: "700" },
  left:       { ...type.caption, color: colors.textMuted, flex: 1, textAlign: "right" },
  title:      { ...type.title, color: colors.text, marginTop: spacing.md },
  valueRow:   { flexDirection: "row", alignItems: "baseline", gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.sm },
  value:      { ...type.statLarge, color: ACCENT },
  unit:       { ...type.small, color: colors.textSecondary, flex: 1 },
  pct:        { ...type.captionStrong, color: colors.textMuted },
  hint:       { ...type.micro, color: colors.textMuted, marginTop: spacing.xs },
  track:      { backgroundColor: colors.surfaceHigh, overflow: "hidden" },
  fill:       { height: "100%", overflow: "hidden" },
  shine:      { position: "absolute", top: 0, bottom: 0, width: "60%" },
  days:       { flexDirection: "row", gap: spacing.xs + spacing.xxs, marginTop: spacing.lg },
  day:        { flex: 1, alignItems: "center", gap: spacing.xxs + 1 },
  dayBox:     { alignSelf: "stretch", height: sizes.avatarSm - spacing.xxs, borderRadius: radii.sm, backgroundColor: colors.surfaceHigh },
  day_win:    { backgroundColor: withAlpha(colors.win, 0.75) },
  day_loss:   { backgroundColor: withAlpha(colors.loss, 0.7) },
  day_even:   { backgroundColor: withAlpha(colors.gold, 0.55) },
  day_none:   { backgroundColor: colors.surfaceHigh },
  day_future: { backgroundColor: "transparent", borderWidth: sizes.borderThick - 0.5, borderStyle: "dashed", borderColor: colors.borderStrong },
  dayLetter:  { ...type.micro, color: colors.textMuted },
  othersLabel:{ ...type.section, color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.xs },
  other:      { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  pressed:    { opacity: 0.7 },
  otherIcon:  { width: sizes.avatarMd, height: sizes.avatarMd, borderRadius: radii.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceRaised },
  otherBody:  { flex: 1, gap: spacing.xs + spacing.xxs },
  otherHead:  { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  otherTitle: { ...type.smallStrong, color: colors.text, flexShrink: 1 },
  otherValue: { ...type.captionStrong, color: colors.textSecondary, fontVariant: ["tabular-nums"] },
  editRow:    { marginBottom: spacing.lg },
  editHead:   { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  editLabel:  { ...type.bodyStrong, color: colors.text, flex: 1 },
  featureBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill, borderWidth: sizes.hairline * 1.5, borderColor: withAlpha(ACCENT, 0.6) },
  featureOn:  { backgroundColor: ACCENT, borderColor: ACCENT },
  featureText:{ ...type.captionStrong, color: ACCENT },
  chips:      { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.sm },
});
