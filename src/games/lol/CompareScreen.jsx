import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, ScrollView, Image, StyleSheet, Alert } from "react-native";
import { Card, Chip, ErrorState, PressableScale, SectionLabel, Skeleton } from "../../components/ui";
import { RegionButton } from "../../components/RegionPicker";
import RankEmblem from "../../components/RankEmblem";
import Reveal from "../../components/Reveal";
import { useT } from "../../i18n/I18nProvider";
import { useBootData } from "../../boot/BootContext";
import { getGame } from "..";
import { searchPlayer } from "./api";
import { getOverallStats, getChampionStats } from "./utils";
import { championIcon } from "../../api/ddragon";
import { loadFavorites } from "../../utils/favorites";
import { errorMessage, formatNumber, tierLabel, winrate } from "../../utils/format";
import { colors, radii, sizes, spacing, fontSizes, type, useAccent, withAlpha } from "../../theme";

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

function Row({ label, a, b, win, accent }) {
  return (
    <View style={styles.row}>
      <Side win={win === "a"} accent={accent} align="left">{a}</Side>
      <Text style={styles.rowLabel}>{label}</Text>
      <Side win={win === "b"} accent={accent} align="right">{b}</Side>
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

/**
 * Comparar dos jugadores de LoL cara a cara. params: { a: { gameName, tagLine, region } }. El segundo jugador se elige
 * entre los favoritos o buscándolo por Riot ID. En cada fila se resalta al que va mejor.
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
  const [regionB, setRegionB] = useState(targetA.region || defaultRegion);
  const [attempt, setAttempt] = useState(0);

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
    if (!name || !tag) { Alert.alert(t("home.badFormat"), t("home.badRiotId")); return; }
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
      { key: "wr", label: t("stats.winrate"), a: num(a.wr, v => `${v}%`), b: num(b.wr, v => `${v}%`), win: winner(a.wr, b.wr) },
      { key: "games", label: t("compare.rankedGames"), a: num(a.games, formatNumber), b: num(b.games, formatNumber), win: null },
      { key: "recent", label: t("compare.recentWinrate"), a: num(a.recentWr, v => `${v}%`), b: num(b.recentWr, v => `${v}%`), win: winner(a.recentWr, b.recentWr) },
      { key: "kda", label: t("stats.avgKda"), a: num(a.kda, v => v.toFixed(2)), b: num(b.kda, v => v.toFixed(2)), win: winner(a.kda, b.kda) },
      { key: "level", label: t("compare.level"), a: num(a.level), b: num(b.level), win: winner(a.level, b.level) },
      { key: "mastery", label: t("compare.mastery"), a: num(a.mastery, formatNumber), b: num(b.mastery, formatNumber), win: winner(a.mastery, b.mastery) },
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
        <Card style={styles.heads}>
          <Header data={A.data} accent={accent} />
          <Text style={styles.vs}>VS</Text>
          {B?.status === "ready" ? <Header data={B.data} accent={accent} /> : (
            <View style={styles.head}>
              <View style={[styles.avatar, styles.avatarEmpty]}><Text style={styles.question}>?</Text></View>
              <Text style={styles.name}>{B?.status === "loading" ? B.name : "—"}</Text>
            </View>
          )}
        </Card>
      </Reveal>

      {B?.status === "loading" ? <Skeleton height={sizes.chart * 2} radius={radii.lg} /> : null}
      {B?.status === "error" ? <ErrorState message={t("compare.loadError", { name: B.name, error: B.message })} onRetry={() => setB(null)} /> : null}

      {rows ? (
        <Reveal order={1}>
          <Card padded={false}>{rows.map((r, i) => (
            <View key={r.key} style={i > 0 && styles.rowDivider}><Row {...r} accent={accent} /></View>
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
          <Card>
            <Text style={styles.hint}>{t("compare.search")}</Text>
            <View style={styles.searchRow}>
              <RegionButton value={regionB} onChange={setRegionB} />
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder={t("home.placeholderRiotId")}
                placeholderTextColor={colors.textFaint}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={submit}
                returnKeyType="search"
              />
              <PressableScale onPress={submit} haptic style={[styles.go, { backgroundColor: accent }]} accessibilityLabel={t("compare.go")}>
                <Text style={styles.goText}>{t("compare.go")}</Text>
              </PressableScale>
            </View>
          </Card>
        </Reveal>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.bg },
  content:    { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },
  center:     { flex: 1, backgroundColor: colors.bg, justifyContent: "center" },
  heads:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  head:       { flex: 1, alignItems: "center", gap: spacing.xs },
  vs:         { ...type.heading, color: colors.textFaint, paddingHorizontal: spacing.sm },
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
  input:      { flex: 1, height: sizes.button - spacing.sm, borderRadius: radii.md, borderWidth: sizes.hairline, borderColor: colors.border, backgroundColor: colors.bg, color: colors.text, paddingHorizontal: spacing.md, fontFamily: "Inter_500Medium" },
  go:         { height: sizes.button - spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  goText:     { ...type.bodyStrong, color: colors.onAccent },
});
