import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, ScrollView, Image, StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import Animated, { Easing, ZoomIn, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { KenBurnsImage } from "../../news/fx";
import Icon from "../../components/Icon";
import { warning } from "../../utils/haptics";
import { Card, Chip, ErrorState, PressableScale, SectionLabel, Skeleton } from "../../components/ui";
import { RegionButton } from "../../components/RegionPicker";
import RankEmblem from "../../components/RankEmblem";
import Reveal from "../../components/Reveal";
import { useT } from "../../i18n/I18nProvider";
import { useBootData } from "../../boot/BootContext";
import { getGame } from "..";
import { getLeaderboard, searchPlayer } from "./api";
import { getOverallStats, getChampionStats } from "./utils";
import { championIcon, championSplash } from "../../api/ddragon";
import { loadFavorites } from "../../utils/favorites";
import { errorMessage, formatNumber, tierLabel, winrate } from "../../utils/format";
import { colors, radii, sizes, spacing, fontSizes, type, useAccent, withAlpha } from "../../theme";

const SIDE_B = colors.info;   // el rival va en azul, tú con el color de LoL (como el comparador de Wild Rift)
// Pros con Riot ID conocido para compararse con un toque
const PROS = [{ gameName: "Hide on bush", tagLine: "KR1", region: "kr", label: "Faker" }];

const TIER_INDEX = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
const DIVISION = { IV: 0, III: 1, II: 2, I: 3 };

// Puntos de liga en una sola escala (igual que el historial): 400 por nivel, 100 por división y el LP encima
function rankScore(entry) {
  const t = TIER_INDEX.indexOf(entry?.tier);
  if (t < 0) return null;
  return t >= 7 ? 2800 + entry.leaguePoints : t * 400 + (DIVISION[entry.rank] ?? 0) * 100 + entry.leaguePoints;
}

// Todo lo que se compara de un jugador, sacado de sus datos de perfil
function statsOf(data) {
  const solo = data.ranked?.find(r => r.queueType === "RANKED_SOLO_5x5") || null;
  const overall = getOverallStats(data.matches || [], data.account.puuid);
  const kdaNum = overall ? (parseFloat(overall.avgKills) + parseFloat(overall.avgAssists)) / Math.max(parseFloat(overall.avgDeaths), 0.1) : null;
  const top = getChampionStats(data.matches || [], data.account.puuid)[0];
  return {
    solo,
    score: rankScore(solo),
    wr: solo ? winrate(solo.wins, solo.losses) : null,
    games: solo ? solo.wins + solo.losses : null,
    recentWr: overall?.wr ?? null,
    kda: kdaNum,
    level: data.summoner?.summonerLevel ?? null,
    mastery: data.mastery?.score ?? null,
    topChampion: top?.name ?? null,
  };
}

// "a" | "b" | null (empate o falta un dato)
const winner = (a, b) => (a == null || b == null || a === b ? null : a > b ? "a" : "b");

function Side({ children, win, accent, align }) {
  return (
    <View style={[styles.side, align === "right" && styles.sideRight, win && { backgroundColor: withAlpha(accent, 0.14), borderColor: withAlpha(accent, 0.5) }]}>
      {children}
    </View>
  );
}

function Row({ label, a, b, win, accent, share, index = 0 }) {
  return (
    <View>
      <View style={styles.row}>
        <Side win={win === "a"} accent={accent} align="left">{a}</Side>
        <Text style={styles.rowLabel}>{label}</Text>
        <Side win={win === "b"} accent={SIDE_B} align="right">{b}</Side>
      </View>
      {share != null ? <TugBar share={share} accent={accent} delay={250 + index * 90} /> : null}
    </View>
  );
}

/** Barra partida en dos: cuánto de cada valor es de cada jugador. Se llena desde el centro al aparecer. */
function TugBar({ share, accent, delay }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withDelay(delay, withTiming(1, { duration: 850, easing: Easing.out(Easing.cubic) })); }, [share]);
  const left = useAnimatedStyle(() => ({ width: `${share * 99 * p.value}%` }));
  const right = useAnimatedStyle(() => ({ width: `${(1 - share) * 99 * p.value}%` }));
  return (
    <View style={styles.tug}>
      <Animated.View style={[styles.tugFill, { backgroundColor: accent }, left]} />
      <Animated.View style={[styles.tugFill, { backgroundColor: SIDE_B }, right]} />
    </View>
  );
}

// Parte del total que es de A (0-1), para la barra partida; null si falta un dato o los dos son 0
const shareOf = (a, b) => (a == null || b == null || a + b <= 0 ? null : a / (a + b));

/** Cabecera: cada jugador sobre el arte de su campeón más jugado, tú en dorado y el rival en azul, con el VS en medio */
function Hero({ A, B, accent, t }) {
  const reduce = useReducedMotion();
  const half = (data, tint, id, empty) => {
    const champ = data ? statsOf(data).topChampion : null;
    return (
      <View style={[styles.half, { borderColor: withAlpha(tint, 0.65) }]}>
        {champ ? <KenBurnsImage uri={championSplash(champ)} style={styles.halfArt} /> : null}
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
          <Defs>
            <LinearGradient id={`cmp${id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={tint} stopOpacity="0.18" />
              <Stop offset="0.5" stopColor={colors.bg} stopOpacity="0.35" />
              <Stop offset="1" stopColor={colors.bg} stopOpacity="0.92" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#cmp${id})`} />
        </Svg>
        {data ? <Header data={data} accent={tint} /> : empty}
      </View>
    );
  };
  return (
    <View style={styles.hero}>
      {half(A.data, accent, "A")}
      {half(B?.status === "ready" ? B.data : null, SIDE_B, "B", (
        <View style={styles.head}>
          <View style={[styles.avatar, styles.avatarEmpty]}><Text style={styles.question}>?</Text></View>
          <Text style={styles.name}>{B?.status === "loading" ? B.name : t("compare.rival")}</Text>
        </View>
      ))}
      <Animated.View key={B?.status === "ready" ? B.data.account.puuid : "none"} entering={reduce ? undefined : ZoomIn.springify().damping(11)} style={styles.vsBadge}>
        <Text style={styles.vsText}>VS</Text>
      </Animated.View>
    </View>
  );
}

const Value = ({ children, color }) => <Text style={[styles.value, color && { color }]}>{children}</Text>;

function Header({ data, accent }) {
  const game = getGame("lol");
  const profile = game.getProfile(data);
  const tint = colors.tier[profile.ranked?.tier] || accent;
  return (
    <View style={styles.head}>
      <View style={[styles.avatar, { borderColor: withAlpha(tint, 0.5) }]}>{profile.avatar}</View>
      <Text style={styles.name} numberOfLines={1}>{profile.name}</Text>
      <Text style={styles.tag}>#{profile.tag}</Text>
    </View>
  );
}

/** "Ganas en 4 de 6": quién va por delante en las filas comparables, con una corona para el que lidera */
function Verdict({ rows, A, B, accent, t }) {
  const reduce = useReducedMotion();
  const scored = rows.filter(r => r.win);
  const a = scored.filter(r => r.win === "a").length, b = scored.length - a;
  if (!scored.length) return null;
  const lead = a === b ? null : a > b ? "a" : "b";
  const name = lead === "a" ? A.account.gameName : lead === "b" ? B.account.gameName : null;
  const color = lead === "a" ? accent : lead === "b" ? SIDE_B : colors.textSecondary;
  return (
    <Animated.View entering={reduce ? undefined : ZoomIn.delay(150).springify().damping(14)} style={[styles.verdict, { borderColor: withAlpha(color, 0.5), backgroundColor: withAlpha(color, 0.1) }]}>
      <Icon name={lead ? "crown" : "compare"} size={fontSizes.lg} color={color} />
      <Text style={[styles.verdictText, { color }]} numberOfLines={2}>{lead ? t("compare.leads", { name, n: Math.max(a, b), of: scored.length }) : t("compare.tie")}</Text>
      <Text style={styles.verdictScore}><Text style={{ color: accent }}>{a}</Text> – <Text style={{ color: SIDE_B }}>{b}</Text></Text>
    </Animated.View>
  );
}

/**
 * Comparar dos jugadores de LoL cara a cara. params: { a: { gameName, tagLine, region } }. El segundo jugador se elige
 * entre los favoritos, un pro, los mejores de Challenger o buscándolo por Riot ID. En cada fila se resalta al que va mejor.
 */
export default function CompareScreen({ route }) {
  const t = useT();
  const accent = useAccent("lol");
  const { a: targetA } = route.params;
  const { region: defaultRegion } = useBootData();
  const [A, setA] = useState({ status: "loading" });
  const [B, setB] = useState(null);                       // null = aún sin elegir
  const [favorites, setFavorites] = useState([]);
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState(null);   // formato incorrecto: bajo el campo, sin alertas
  const [regionB, setRegionB] = useState(targetA.region || defaultRegion);
  const [attempt, setAttempt] = useState(0);
  const pros = PROS.filter(p => !(p.gameName.toLowerCase() === targetA.gameName.toLowerCase() && p.tagLine.toLowerCase() === targetA.tagLine.toLowerCase()));
  const [top, setTop] = useState([]);   // los 5 primeros de Challenger de la región elegida

  useEffect(() => {
    let alive = true;
    getLeaderboard(regionB, { limit: 5 }).then(r => { if (alive) setTop(r.players.slice(0, 5)); }).catch(() => { if (alive) setTop([]); });
    return () => { alive = false; };
  }, [regionB]);

  useEffect(() => {
    let cancelled = false;
    setA({ status: "loading" });
    searchPlayer(targetA.gameName, targetA.tagLine, targetA.region)
      .then(data => { if (!cancelled) setA({ status: "ready", data }); })
      .catch(e => { if (!cancelled) setA({ status: "error", message: errorMessage(e, t("profile.loadError")) }); });
    return () => { cancelled = true; };
  }, [attempt]);

  useEffect(() => {
    loadFavorites()
      .then(list => setFavorites(list.filter(f => f.gameId === "lol" && !(f.gameName.toLowerCase() === targetA.gameName.toLowerCase() && f.tagLine.toLowerCase() === targetA.tagLine.toLowerCase()))))
      .catch(e => console.warn("No se pudieron leer los favoritos:", e.message));
  }, []);

  function choose(gameName, tagLine, region) {
    setB({ status: "loading", name: gameName });
    searchPlayer(gameName, tagLine, region)
      .then(data => setB({ status: "ready", data }))
      .catch(e => setB({ status: "error", name: gameName, message: errorMessage(e, t("profile.loadError")) }));
  }

  function submit() {
    const text = input.trim();
    const cut = text.lastIndexOf("#");
    const name = (cut < 0 ? text : text.slice(0, cut)).trim();
    const tag = cut < 0 ? "" : text.slice(cut + 1).trim();
    if (!name || !tag) { warning(); setInputError(t("home.badRiotId")); return; }
    setInputError(null);
    choose(name, tag, regionB);
  }

  const rows = useMemo(() => {
    if (A.status !== "ready" || B?.status !== "ready") return null;
    const a = statsOf(A.data), b = statsOf(B.data);
    const rankCell = s => (s.solo ? (
      <View style={styles.rankCell}>
        <RankEmblem tier={s.solo.tier} size={sizes.item + spacing.sm} />
        <Text style={[styles.value, styles.rankText, { color: colors.tier[s.solo.tier] }]} numberOfLines={1} adjustsFontSizeToFit>{tierLabel(s.solo.tier, s.solo.rank)}</Text>
        <Text style={styles.sub}>{s.solo.leaguePoints} LP</Text>
      </View>
    ) : <Value color={colors.textMuted}>{t("ranked.unranked")}</Value>);
    const num = (v, fmt = x => String(x)) => <Value>{v == null ? "—" : fmt(v)}</Value>;
    const champ = s => (s.topChampion ? <Image source={{ uri: championIcon(s.topChampion) }} style={styles.champ} /> : <Value>—</Value>);
    return [
      { key: "rank", label: t("compare.rank"), a: rankCell(a), b: rankCell(b), win: winner(a.score, b.score) },
      { key: "wr", label: t("stats.winrate"), a: num(a.wr, v => `${v}%`), b: num(b.wr, v => `${v}%`), win: winner(a.wr, b.wr), share: shareOf(a.wr, b.wr) },
      { key: "games", label: t("compare.rankedGames"), a: num(a.games, formatNumber), b: num(b.games, formatNumber), win: null },
      { key: "recent", label: t("compare.recentWinrate"), a: num(a.recentWr, v => `${v}%`), b: num(b.recentWr, v => `${v}%`), win: winner(a.recentWr, b.recentWr), share: shareOf(a.recentWr, b.recentWr) },
      { key: "kda", label: t("stats.avgKda"), a: num(a.kda, v => v.toFixed(2)), b: num(b.kda, v => v.toFixed(2)), win: winner(a.kda, b.kda), share: shareOf(a.kda, b.kda) },
      { key: "level", label: t("compare.level"), a: num(a.level), b: num(b.level), win: winner(a.level, b.level), share: shareOf(a.level, b.level) },
      { key: "mastery", label: t("compare.mastery"), a: num(a.mastery, formatNumber), b: num(b.mastery, formatNumber), win: winner(a.mastery, b.mastery), share: shareOf(a.mastery, b.mastery) },
      { key: "champ", label: t("stats.mostPlayed"), a: champ(a), b: champ(b), win: null },
    ];
  }, [A, B, t]);

  if (A.status === "loading") {
    return <View style={styles.container}><View style={styles.content}><Skeleton height={sizes.chart * 2} radius={radii.lg} /></View></View>;
  }
  if (A.status === "error") {
    return <View style={styles.center}><ErrorState message={A.message} onRetry={() => setAttempt(n => n + 1)} /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Reveal order={0}>
        <Hero A={A} B={B} accent={accent} t={t} />
      </Reveal>

      {B?.status === "loading" ? <Skeleton height={sizes.chart * 2} radius={radii.lg} /> : null}
      {B?.status === "error" ? <ErrorState message={t("compare.loadError", { name: B.name, error: B.message })} onRetry={() => setB(null)} /> : null}

      {rows ? (
        <Reveal order={1}>
          <Verdict rows={rows} A={A.data} B={B.data} accent={accent} t={t} />
          <Card padded={false}>{rows.map((r, i) => (
            <View key={r.key} style={i > 0 && styles.rowDivider}><Row {...r} index={i} accent={accent} /></View>
          ))}</Card>
        </Reveal>
      ) : null}

      {(!B || B.status !== "loading") ? (
        <Reveal order={2}>
          <SectionLabel>{B?.status === "ready" ? t("compare.change") : t("compare.pick")}</SectionLabel>
          {favorites.length ? (
            <View style={styles.favs}>
              {favorites.map(f => <Chip key={f.puuid} label={f.gameName} onPress={() => choose(f.gameName, f.tagLine, f.region)} game="lol" />)}
            </View>
          ) : null}
          {pros.length ? <Text style={styles.pickGroup}>{t("compare.pros")}</Text> : null}
          <View style={styles.favs}>
            {pros.map(p => <Chip key={p.label} label={p.label} icon={<Icon name="crown" size={fontSizes.sm} color={colors.gold} />} onPress={() => choose(p.gameName, p.tagLine, p.region)} game="lol" />)}
          </View>
          {top.length ? (
            <>
              <Text style={styles.pickGroup}>{t("compare.challenger", { region: regionB.toUpperCase() })}</Text>
              <View style={styles.favs}>
                {top.map((p, i) => <Chip key={p.puuid} label={`${i + 1}. ${p.gameName}`} onPress={() => choose(p.gameName, p.tagLine, regionB)} game="lol" />)}
              </View>
            </>
          ) : null}
          <Card>
            <Text style={styles.hint}>{t("compare.search")}</Text>
            <View style={styles.searchRow}>
              <RegionButton value={regionB} onChange={setRegionB} />
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={v => { setInput(v); if (inputError) setInputError(null); }}
                accessibilityLabel={t("compare.search")}
                placeholder={t("home.placeholderRiotId")}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={submit}
                returnKeyType="search"
              />
              <PressableScale onPress={submit} haptic style={[styles.go, { backgroundColor: accent }]} accessibilityLabel={t("compare.go")}>
                <Text style={styles.goText}>{t("compare.go")}</Text>
              </PressableScale>
            </View>
            {inputError ? (
              <View style={styles.errorRow} accessibilityLiveRegion="polite">
                <Icon name="alert" size={fontSizes.md} color={colors.loss} />
                <Text style={styles.errorText}>{inputError}</Text>
              </View>
            ) : null}
          </Card>
        </Reveal>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  errorRow:   { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginTop: spacing.md },
  errorText:  { ...type.small, color: colors.text, flex: 1 },
  container:  { flex: 1, backgroundColor: colors.bg },
  content:    { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },
  center:     { flex: 1, backgroundColor: colors.bg, justifyContent: "center" },
  heads:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  head:       { flex: 1, alignItems: "center", gap: spacing.xs },
  vs:         { ...type.heading, color: colors.textMuted, paddingHorizontal: spacing.sm },
  avatar:     { borderRadius: radii.pill, borderWidth: 2, padding: 2, marginBottom: spacing.xs },
  avatarEmpty:{ width: sizes.avatarXl, height: sizes.avatarXl, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceHigh, borderColor: colors.border },
  question:   { ...type.statLarge, color: colors.textMuted },
  name:       { ...type.bodyStrong, fontSize: fontSizes.base, color: colors.text, maxWidth: 130 },
  tag:        { ...type.caption, color: colors.textMuted },
  row:        { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, gap: spacing.xs },
  rowDivider: { borderTopWidth: sizes.hairline, borderTopColor: colors.border },
  rowLabel:   { ...type.micro, fontSize: 9, color: colors.textMuted, textAlign: "center", width: 84, textTransform: "uppercase" },
  side:       { flex: 1, minHeight: sizes.placement, alignItems: "center", justifyContent: "center", borderRadius: radii.md, borderWidth: sizes.hairline, borderColor: "transparent", paddingVertical: spacing.xs },
  sideRight:  {},
  value:      { ...type.stat, fontSize: fontSizes.lg, color: colors.text },
  sub:        { ...type.caption, color: colors.textMuted },
  rankCell:   { alignItems: "center", gap: 2, alignSelf: "stretch" },
  rankText:   { fontSize: fontSizes.md, maxWidth: "100%" },
  champ:      { width: sizes.placement, height: sizes.placement, borderRadius: radii.md },
  favs:       { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.sm, marginBottom: spacing.md },
  hint:       { ...type.small, color: colors.textMuted, marginBottom: spacing.md },
  searchRow:  { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  input:      { flex: 1, minWidth: 0, height: sizes.button - spacing.sm, borderRadius: radii.md, borderWidth: sizes.hairline, borderColor: colors.border, backgroundColor: colors.bg, color: colors.text, paddingHorizontal: spacing.md, fontFamily: "Inter_500Medium" },
  go:         { height: sizes.button - spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  goText:     { ...type.bodyStrong, color: colors.onAccent },
  hero:       { flexDirection: "row", gap: spacing.sm },
  half:       { flex: 1, height: sizes.chart * 1.75, borderRadius: radii.xl, overflow: "hidden", borderWidth: sizes.borderThick - 0.5, justifyContent: "flex-end", paddingBottom: spacing.md, backgroundColor: colors.surface },
  halfArt:    { opacity: 0.85 },
  vsBadge:    { position: "absolute", left: "50%", top: "38%", marginLeft: -(sizes.avatarLg + spacing.xs) / 2, width: sizes.avatarLg + spacing.xs, height: sizes.avatarLg + spacing.xs, borderRadius: radii.pill, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, borderWidth: sizes.hairline, borderColor: colors.borderStrong },
  vsText:     { ...type.captionStrong, color: colors.text, letterSpacing: 1 },
  tug:        { flexDirection: "row", justifyContent: "space-between", height: sizes.barThin + 1, marginHorizontal: spacing.md, marginBottom: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.surfaceHigh, overflow: "hidden" },
  tugFill:    { height: "100%", borderRadius: radii.pill },
  verdict:    { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radii.lg, borderWidth: sizes.hairline, marginBottom: spacing.md },
  verdictText:{ ...type.bodyStrong, flex: 1 },
  verdictScore:{ ...type.stat, color: colors.textMuted },
  pickGroup:  { ...type.caption, color: colors.textMuted, marginBottom: spacing.xs },
});
