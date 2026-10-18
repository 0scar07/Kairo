import React, { useEffect, useLayoutEffect, useState } from "react";
import { View, Text, Image, ScrollView, StyleSheet } from "react-native";
import { useT } from "../../i18n/I18nProvider";
import { Chip, CountUp, ErrorState, RowSkeleton, SegmentedTabs } from "../../components/ui";
import ChampionTable from "./components/ChampionTable";
import ProFollow from "./components/ProFollow";
import { Group, Ring, RING_SIZE } from "./components/SummaryRings";
import { ROLE_KEYS, getProLeague, getProTeam, getProTeamStats, tournamentLabel } from "./esports";
import { errorMessage, formatNumber, winrate } from "../../utils/format";
import { colors, sizes, spacing, fontSizes, type, winrateColor, useAccent } from "../../theme";

const SEASONS = 6;

/**
 * Jugador profesional: foto, equipo y rol arriba; pestañas Resumen y Campeones; filtro de torneo.
 * Las cifras salen de las partidas de su equipo en ese torneo (ver server/routes/esports.js). params { slug, playerId, leagueSlug, tournamentId }
 */
export default function ProPlayerScreen({ route, navigation }) {
  const t = useT();
  const accent = useAccent("lol");
  const { slug, playerId, leagueSlug } = route.params;
  const [tournamentId, setTournamentId] = useState(route.params.tournamentId);
  const [team, setTeam] = useState({ status: "loading" });
  const [league, setLeague] = useState(null);
  const [stats, setStats] = useState({ status: "loading" });
  const [tab, setTab] = useState("summary");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    getProTeam(slug).then(d => alive && setTeam({ status: "ready", ...d })).catch(e => alive && setTeam({ status: "error", message: errorMessage(e) }));
    if (leagueSlug) getProLeague(leagueSlug, tournamentId).then(d => alive && setLeague(d)).catch(() => {});
    return () => { alive = false; };
  }, [slug, attempt]);

  useEffect(() => {
    if (!tournamentId) return undefined;
    let alive = true;
    setStats({ status: "loading" });
    getProTeamStats(slug, tournamentId).then(d => alive && setStats({ status: "ready", ...d })).catch(e => alive && setStats({ status: "error", message: errorMessage(e) }));
    return () => { alive = false; };
  }, [slug, tournamentId, attempt]);

  const player = team.status === "ready" ? team.players.find(p => p.id === playerId) : null;
  useLayoutEffect(() => { if (player) navigation.setOptions({ title: player.name }); }, [player?.name]);

  if (team.status === "error") return <View style={styles.center}><ErrorState message={t("pros.loadError", { error: team.message })} onRetry={() => setAttempt(n => n + 1)} /></View>;

  const s = stats.status === "ready" ? stats.players[playerId] : null;
  const tournaments = league?.tournaments || [];
  const tournament = tournaments.find(x => x.id === tournamentId);
  const leagueName = league?.league?.name || team.league || "";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {player ? (
        <View style={styles.hero}>
          {/* Logo del equipo como marca de agua detrás del nombre, foto del jugador a la derecha */}
          {team.image ? <Image source={{ uri: team.image }} style={styles.watermark} resizeMode="contain" /> : null}
          <View style={styles.heroText}>
            <Text style={styles.name} accessibilityRole="header" numberOfLines={2}>{team.code ? `${team.code} ${player.name}` : player.name}</Text>
            {player.firstName || player.lastName ? <Text style={styles.realName}>{[player.firstName, player.lastName].filter(Boolean).join(" ")}</Text> : null}
            <View style={styles.teamRow}>
              {team.image ? <Image source={{ uri: team.image }} style={styles.teamLogo} resizeMode="contain" /> : null}
              <Text style={styles.teamText}>{team.name}{player.role ? ` · ${t(ROLE_KEYS[player.role])}` : ""}</Text>
            </View>
          </View>
          {player.image ? <Image source={{ uri: player.image }} style={styles.photo} resizeMode="cover" accessibilityIgnoresInvertColors /> : null}
        </View>
      ) : <RowSkeleton />}

      {player ? <ProFollow player={player} team={team} slug={slug} leagueSlug={leagueSlug} /> : null}

      <SegmentedTabs tabs={[{ key: "summary", label: t("pros.tabSummary") }, { key: "champions", label: t("lol.tabChampions") }]} value={tab} onChange={setTab} game="lol" />

      {tournaments.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {tournaments.slice(0, SEASONS).map(x => (
            <Chip key={x.id} label={tournamentLabel(x.slug, leagueSlug)} active={x.id === tournamentId} game="lol" onPress={() => setTournamentId(x.id)} />
          ))}
        </ScrollView>
      ) : null}

      {stats.status === "loading" ? <><RowSkeleton /><RowSkeleton /><RowSkeleton /></> : null}
      {stats.status === "error" ? <Text style={styles.note}>{t("pros.statsError", { error: stats.message })}</Text> : null}
      {stats.status === "ready" && !s ? <Text style={styles.note}>{t("pros.noPlayerGames")}</Text> : null}

      {s && tab === "summary" ? (
        <>
          <Text style={styles.title}>{t("pros.leagueData", { league: leagueName })}</Text>
          {tournament ? <Text style={styles.sub}>{tournamentLabel(tournament.slug, leagueSlug)} · {t("common.games", { count: s.games })}</Text> : null}
          <View style={styles.rings}>
            <View style={styles.ring} accessible accessibilityLabel={`${t("stats.winrate")} ${winrate(s.wins, s.losses)}%, ${s.wins}V ${s.losses}D`}>
              <Ring round segments={[{ value: winrate(s.wins, s.losses), color: winrateColor(winrate(s.wins, s.losses), accent) }, { value: 100 - winrate(s.wins, s.losses), color: null }]} />
              <View style={styles.center2} pointerEvents="none">
                <CountUp value={winrate(s.wins, s.losses)} format={v => `${v}%`} style={styles.big} />
                <Text style={styles.small}>{s.wins}V {s.losses}D</Text>
              </View>
              <Text style={styles.caption}>{t("stats.winrate")}</Text>
            </View>
            <View style={styles.ring} accessible accessibilityLabel={`KDA ${s.kda ?? t("match.perfect")}`}>
              <Ring gap segments={[{ value: s.kills, color: colors.win }, { value: s.assists, color: accent }, { value: s.deaths, color: colors.loss }]} />
              <View style={styles.center2} pointerEvents="none">
                <Text style={styles.big}>{s.kda == null ? t("match.perfect") : s.kda.toFixed(2)}</Text>
                <Text style={styles.small}>{s.kills} / {s.deaths} / {s.assists}</Text>
              </View>
              <Text style={styles.caption}>KDA</Text>
            </View>
          </View>
          <Group cells={[
            { value: formatNumber(s.kills), label: t("stats.totalKills") },
            { value: formatNumber(s.deaths), label: t("stats.totalDeaths") },
            { value: formatNumber(s.assists), label: t("stats.totalAssists") },
          ]} />
          <Group cells={[
            { value: s.killParticipation != null ? `${s.killParticipation}%` : "–", label: t("stats.killParticipation") },
            { value: s.goldPerMin != null ? formatNumber(s.goldPerMin) : "–", label: t("stats.goldMin") },
            { value: s.csPerMin != null ? String(s.csPerMin) : "–", label: t("stats.csMin") },
          ]} />
          <Group cells={[
            { value: String(s.games), label: t("stats.matches") },
            { value: s.damageShare != null ? `${s.damageShare}%` : "–", label: t("pros.damageShare") },
            { value: String(s.champions.length), label: t("pros.championsPlayed") },
          ]} />
        </>
      ) : null}

      {s && tab === "champions" ? (
        <ChampionTable champs={s.champions.map(c => ({
          name: c.name,
          games: c.games,
          wr: winrate(c.wins, c.games - c.wins),
          kda: c.deaths ? ((c.kills + c.assists) / c.deaths).toFixed(2) : t("match.perfect"),
          kills: (c.kills / c.games).toFixed(1), deaths: (c.deaths / c.games).toFixed(1), assists: (c.assists / c.games).toFixed(1),
        }))} />
      ) : null}

      <Text style={styles.source}>{t("pros.source")}</Text>
    </ScrollView>
  );
}

const PHOTO = sizes.iconHero + spacing.xxxl;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content:   { padding: spacing.lg, paddingBottom: spacing.xxxl },
  center:    { flex: 1, backgroundColor: colors.bg, justifyContent: "center" },
  hero:      { flexDirection: "row", alignItems: "flex-end", minHeight: PHOTO, marginBottom: spacing.md, overflow: "hidden" },
  watermark: { position: "absolute", left: -spacing.lg, top: 0, width: PHOTO * 1.6, height: PHOTO, opacity: 0.14 },
  heroText:  { flex: 1, minWidth: 0, paddingBottom: spacing.sm },
  name:      { ...type.largeTitle, fontSize: fontSizes.xxxl, color: colors.text },
  realName:  { ...type.body, color: colors.textMuted, marginTop: spacing.xxs },
  teamRow:   { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.md },
  teamLogo:  { width: sizes.item, height: sizes.item },
  teamText:  { ...type.smallStrong, color: colors.textSecondary, flexShrink: 1 },
  photo:     { width: PHOTO * 0.82, height: PHOTO },
  chips:     { marginBottom: spacing.lg },
  title:     { ...type.title, color: colors.text },
  sub:       { ...type.small, color: colors.textMuted, marginTop: spacing.xxs },
  rings:     { flexDirection: "row", justifyContent: "space-around", marginTop: spacing.lg, marginBottom: spacing.lg },
  ring:      { alignItems: "center" },
  center2:   { position: "absolute", top: 0, width: RING_SIZE, height: RING_SIZE, alignItems: "center", justifyContent: "center" },
  big:       { ...type.statLarge, fontSize: fontSizes.xxl + spacing.xxs, color: colors.text },
  small:     { ...type.caption, color: colors.textSecondary, fontVariant: ["tabular-nums"] },
  caption:   { ...type.small, color: colors.textMuted, marginTop: spacing.sm },
  note:      { ...type.small, color: colors.textMuted, marginVertical: spacing.sm },
  source:    { ...type.micro, color: colors.textMuted, marginTop: spacing.md },
});
