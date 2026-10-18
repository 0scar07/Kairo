import React, { useEffect, useLayoutEffect, useState } from "react";
import { View, Text, Image, ScrollView, Pressable, StyleSheet } from "react-native";
import { useT } from "../../i18n/I18nProvider";
import { Chip, ErrorState, RowSkeleton, SectionLabel } from "../../components/ui";
import { ROLE_KEYS, getProLeague, getProTeam, getProTeamStats, tournamentLabel } from "./esports";
import { errorMessage, winrate } from "../../utils/format";
import { colors, radii, sizes, spacing, fontSizes, type, kdaColor, winrateColor, useAccent } from "../../theme";

const SEASONS = 6;   // torneos que se ofrecen en el filtro (los más recientes)

// Equipo profesional: logo, liga, filtro de torneo y roster como tabla (Partidas · KDA · Winrate). params { slug, leagueSlug, tournamentId }
export default function ProTeamScreen({ route, navigation }) {
  const t = useT();
  const { slug, leagueSlug } = route.params;
  const [tournamentId, setTournamentId] = useState(route.params.tournamentId);
  const [team, setTeam] = useState({ status: "loading" });
  const [tournaments, setTournaments] = useState([]);
  const [stats, setStats] = useState({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setTeam({ status: "loading" });
    getProTeam(slug).then(d => alive && setTeam({ status: "ready", ...d })).catch(e => alive && setTeam({ status: "error", message: errorMessage(e) }));
    if (leagueSlug) getProLeague(leagueSlug, tournamentId).then(d => alive && setTournaments(d.tournaments || [])).catch(() => {});
    return () => { alive = false; };
  }, [slug, attempt]);

  useEffect(() => {
    if (!tournamentId) return undefined;
    let alive = true;
    setStats({ status: "loading" });
    getProTeamStats(slug, tournamentId).then(d => alive && setStats({ status: "ready", ...d })).catch(e => alive && setStats({ status: "error", message: errorMessage(e) }));
    return () => { alive = false; };
  }, [slug, tournamentId, attempt]);

  useLayoutEffect(() => { if (team.status === "ready") navigation.setOptions({ title: team.code || team.name }); }, [team.status]);

  if (team.status === "error") return <View style={styles.center}><ErrorState message={t("pros.loadError", { error: team.message })} onRetry={() => setAttempt(n => n + 1)} /></View>;

  const players = team.status === "ready" ? team.players : [];
  const byId = stats.status === "ready" ? stats.players : {};
  const played = players.filter(p => byId[p.id]?.games).sort((a, b) => byId[b.id].games - byId[a.id].games);
  const bench = players.filter(p => !byId[p.id]?.games);
  const open = p => navigation.navigate("ProPlayer", { slug, playerId: p.id, leagueSlug, tournamentId });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {team.status === "ready" ? (
        <View style={styles.hero}>
          {team.image ? <Image source={{ uri: team.image }} style={styles.logo} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
          <View style={styles.heroText}>
            <Text style={styles.name} accessibilityRole="header">{team.name}</Text>
            <Text style={styles.sub}>{[team.league, team.code].filter(Boolean).join(" · ")}</Text>
            {stats.status === "ready" && stats.series ? <Text style={styles.sub}>{t("pros.seriesPlayed", { series: stats.series, games: stats.games })}</Text> : null}
          </View>
        </View>
      ) : <RowSkeleton />}

      {tournaments.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {tournaments.slice(0, SEASONS).map(x => (
            <Chip key={x.id} label={tournamentLabel(x.slug, leagueSlug)} active={x.id === tournamentId} game="lol" onPress={() => setTournamentId(x.id)} />
          ))}
        </ScrollView>
      ) : null}

      <SectionLabel>{t("pros.roster")}</SectionLabel>
      {stats.status === "error" ? <Text style={styles.note}>{t("pros.statsError", { error: stats.message })}</Text> : null}
      <View style={styles.table}>
        <View style={[styles.row, styles.head]} accessibilityRole="header">
          <Text style={[styles.headText, styles.player]}>{t("explore.colPlayer")}</Text>
          <Text style={[styles.headText, styles.num]}>{t("stats.matches")}</Text>
          <Text style={[styles.headText, styles.num]}>KDA</Text>
          <Text style={[styles.headText, styles.num]}>{t("stats.winrate")}</Text>
        </View>
        {team.status === "loading" || stats.status === "loading" ? <><RowSkeleton /><RowSkeleton /><RowSkeleton /></> : null}
        {stats.status !== "loading" && [...played, ...bench].map(p => (
          <PlayerRow key={p.id} player={p} stats={byId[p.id]} onPress={() => open(p)} />
        ))}
      </View>
      {stats.status === "ready" && !played.length ? <Text style={styles.note}>{t("pros.noGames")}</Text> : null}
      <Text style={styles.source}>{t("pros.source")}</Text>
    </ScrollView>
  );
}

function PlayerRow({ player, stats, onPress }) {
  const t = useT();
  const accent = useAccent("lol");
  const games = stats?.games || 0;
  const wr = games ? winrate(stats.wins, stats.losses) : null;
  const kda = games ? (stats.kda == null ? t("match.perfect") : stats.kda.toFixed(2)) : "–";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, styles.body, pressed && styles.pressed, !games && styles.dim]}
      accessibilityRole="button"
      accessibilityLabel={`${player.name}${player.role ? `, ${t(ROLE_KEYS[player.role])}` : ""}${games ? `, ${t("common.games", { count: games })}, ${kda} KDA, ${wr}%` : ""}`}
    >
      <View style={[styles.player, styles.playerCell]}>
        {player.image ? <Image source={{ uri: player.image }} style={styles.photo} /> : <View style={[styles.photo, styles.photoEmpty]}><Text style={styles.initial}>{player.name?.[0] || "?"}</Text></View>}
        <View style={styles.names}>
          <Text style={styles.playerName} numberOfLines={1}>{player.name}</Text>
          <Text style={styles.role} numberOfLines={1}>{player.role ? t(ROLE_KEYS[player.role]) : "–"}</Text>
        </View>
      </View>
      <Text style={[styles.value, styles.num]}>{games || "–"}</Text>
      <Text style={[styles.value, styles.num, games && { color: kdaColor(kda, colors.text) }]}>{kda}</Text>
      <Text style={[styles.value, styles.num, wr != null && { color: winrateColor(wr, accent) }]}>{wr != null ? `${wr}%` : "–"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.bg },
  content:    { padding: spacing.lg, paddingBottom: spacing.xxxl },
  center:     { flex: 1, backgroundColor: colors.bg, justifyContent: "center" },
  hero:       { flexDirection: "row", alignItems: "center", gap: spacing.lg, marginBottom: spacing.lg },
  logo:       { width: sizes.iconHero, height: sizes.iconHero },
  heroText:   { flex: 1, minWidth: 0 },
  name:       { ...type.largeTitle, fontSize: fontSizes.xxxl, color: colors.text },
  sub:        { ...type.small, color: colors.textMuted, marginTop: spacing.xxs },
  chips:      { marginBottom: spacing.lg },
  table:      { borderRadius: radii.lg, overflow: "hidden", borderWidth: sizes.hairline, borderColor: colors.border, backgroundColor: colors.surface },
  row:        { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md },
  head:       { minHeight: spacing.xxl + spacing.xxs, backgroundColor: colors.surfaceRaised },
  headText:   { ...type.label, color: colors.textMuted },
  body:       { minHeight: sizes.button + spacing.md, borderTopWidth: sizes.hairline, borderTopColor: colors.border, paddingVertical: spacing.xs },
  pressed:    { backgroundColor: colors.surfaceRaised },
  dim:        { opacity: 0.6 },
  player:     { flex: 1, minWidth: 0 },
  playerCell: { flexDirection: "row", alignItems: "center", gap: spacing.sm + spacing.xxs, paddingRight: spacing.sm },
  photo:      { width: sizes.avatarLg, height: sizes.avatarLg, borderRadius: radii.pill, backgroundColor: colors.surfaceHigh },
  photoEmpty: { alignItems: "center", justifyContent: "center" },
  initial:    { ...type.heading, color: colors.textMuted },
  names:      { flex: 1, minWidth: 0 },
  playerName: { ...type.bodyStrong, fontSize: fontSizes.base, color: colors.text },
  role:       { ...type.caption, color: colors.textMuted },
  num:        { width: sizes.avatarXl - spacing.md, textAlign: "right" },
  value:      { ...type.stat, fontSize: fontSizes.base, color: colors.text, fontVariant: ["tabular-nums"] },
  note:       { ...type.small, color: colors.textMuted, marginVertical: spacing.sm },
  source:     { ...type.micro, color: colors.textMuted, marginTop: spacing.md },
});
