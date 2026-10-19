import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Linking, RefreshControl, StyleSheet } from "react-native";
import { Card, EmptyState, ErrorState, PressableScale, Skeleton } from "../../components/ui";
import { LiveTag, MatchRow, TeamCrest } from "./components";
import { getEsports } from "./api";
import { useT } from "../../i18n/I18nProvider";
import { activeLanguage } from "../../i18n";
import { errorMessage } from "../../utils/format";
import { select } from "../../utils/haptics";
import { accents, colors, radii, sizes, spacing, type, withAlpha } from "../../theme";

const ACCENT = accents.wildrift;
const dayKey = iso => (iso ? new Date(iso).toDateString() : "");
const fmtDay = d => new Date(d).toLocaleDateString(activeLanguage(), { weekday: "short", day: "numeric" });
const fmtTime = iso => new Date(iso).toLocaleTimeString(activeLanguage(), { hour: "2-digit", minute: "2-digit" });
const fmtDate = iso => new Date(iso).toLocaleDateString(activeLanguage(), { day: "numeric", month: "short" });

/** Partido en vivo: cada mitad de la tarjeta con el color de su equipo */
function LiveCard({ match, t }) {
  const [a, b] = match.teams;
  return (
    <Card style={styles.live} padded={false}>
      <View style={styles.split} pointerEvents="none">
        <View style={[styles.half, { backgroundColor: withAlpha(colors.info, 0.16) }]} />
        <View style={[styles.half, { backgroundColor: withAlpha(colors.loss, 0.16) }]} />
      </View>
      <View style={styles.liveTop}>
        <LiveTag text={t("wr.live")} />
        <Text style={styles.liveInfo} numberOfLines={1}>{[match.league?.name, match.bestOf ? `BO${match.bestOf}` : null].filter(Boolean).join(" · ")}</Text>
      </View>
      <MatchRow match={match} />
      {match.games?.length ? (
        <View style={styles.games}>
          {match.games.map(g => (
            <View key={g.position} style={[styles.game, g.winnerId === a?.id ? styles.gameA : g.winnerId === b?.id ? styles.gameB : null]} />
          ))}
        </View>
      ) : null}
      {match.stream ? (
        <PressableScale onPress={() => Linking.openURL(match.stream)} style={styles.watch} accessibilityRole="link">
          <Text style={styles.watchText}>{t("wr.watch")} ›</Text>
        </PressableScale>
      ) : null}
    </Card>
  );
}

/** Fila de un partido de la lista: hora (o resultado), los dos equipos y la liga */
function MatchItem({ match }) {
  const [a, b] = match.teams;
  const done = match.status === "finished";
  const won = id => done && match.winnerId != null && match.winnerId === id;
  return (
    <View style={styles.item}>
      <Text style={styles.itemTime}>{done ? fmtDate(match.beginAt) : fmtTime(match.beginAt)}</Text>
      <View style={styles.itemTeams}>
        {[a, b].map((tm, i) => (
          <View key={i} style={styles.itemTeam}>
            <TeamCrest team={tm} size={sizes.item} />
            <Text style={[styles.itemName, won(tm?.id) && styles.winner]} numberOfLines={1}>{tm?.name || "?"}</Text>
            {done ? <Text style={[styles.itemScore, won(tm?.id) && styles.winner]}>{tm?.score ?? "-"}</Text> : null}
          </View>
        ))}
      </View>
      <Text style={styles.itemLeague} numberOfLines={2}>{match.league?.name || ""}</Text>
    </View>
  );
}

/**
 * Esports de Wild Rift con PandaScore: el partido en vivo, el calendario por día, los últimos resultados y los
 * torneos en curso. Si el servidor no tiene la key de PandaScore lo explica en vez de mostrar un error.
 */
export default function EsportsScreen() {
  const t = useT();
  const [state, setState] = useState({ status: "loading" });
  const [day, setDay] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    getEsports()
      .then(data => { if (alive) setState({ status: "ready", data }); })
      .catch(e => {
        if (!alive) return;
        const code = e?.response?.data?.code;
        setState(code === "NOT_CONFIGURED" ? { status: "off" } : { status: "error", message: errorMessage(e) });
      })
      .finally(() => { if (alive) setRefreshing(false); });
    return () => { alive = false; };
  }, [attempt]);

  const data = state.data;
  // Días con partidos próximos (máximo una semana de botones)
  const days = useMemo(() => {
    const seen = new Map();
    for (const m of data?.upcoming || []) if (m.beginAt && !seen.has(dayKey(m.beginAt))) seen.set(dayKey(m.beginAt), m.beginAt);
    return [...seen.entries()].slice(0, 7);
  }, [data]);
  const current = day && days.some(([k]) => k === day) ? day : days[0]?.[0];
  const upcoming = (data?.upcoming || []).filter(m => dayKey(m.beginAt) === current);

  if (state.status === "loading") {
    return <View style={[styles.container, styles.pad]}>{[0, 1, 2].map(i => <Skeleton key={i} height={sizes.chart} radius={radii.lg} style={styles.gap} />)}</View>;
  }
  if (state.status === "off") {
    return <View style={styles.center}><EmptyState icon="trophy" title={t("wr.esportsOffTitle")} text={t("wr.esportsOff")} /></View>;
  }
  if (state.status === "error") return <View style={styles.center}><ErrorState message={state.message} onRetry={() => setAttempt(n => n + 1)} /></View>;

  const empty = !data.running.length && !data.upcoming.length && !data.past.length;
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.pad, styles.content]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setAttempt(n => n + 1); }} tintColor={ACCENT} />}
    >
      {data.running.map(m => <LiveCard key={m.id} match={m} t={t} />)}

      {days.length ? (
        <>
          <Text style={styles.section}>{t("wr.upcoming")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
            {days.map(([k, iso]) => {
              const on = k === current;
              return (
                <PressableScale key={k} onPress={() => { select(); setDay(k); }} style={[styles.day, on && styles.dayOn]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
                  <Text style={[styles.dayText, on && styles.dayTextOn]}>{fmtDay(iso)}</Text>
                </PressableScale>
              );
            })}
          </ScrollView>
          <Card padded={false}>{upcoming.map((m, i) => <View key={m.id} style={i ? styles.sep : null}><MatchItem match={m} /></View>)}</Card>
        </>
      ) : null}

      {data.past.length ? (
        <>
          <Text style={styles.section}>{t("wr.results")}</Text>
          <Card padded={false}>{data.past.map((m, i) => <View key={m.id} style={i ? styles.sep : null}><MatchItem match={m} /></View>)}</Card>
        </>
      ) : null}

      {data.tournaments.length ? (
        <>
          <Text style={styles.section}>{t("wr.tournaments")}</Text>
          {data.tournaments.map(tr => (
            <Card key={tr.id} style={styles.trophy}>
              <Text style={styles.trophyName} numberOfLines={2}>{tr.name}</Text>
              <Text style={styles.trophySub}>{[tr.beginAt && tr.endAt ? `${fmtDate(tr.beginAt)} – ${fmtDate(tr.endAt)}` : null, tr.teams ? t("wr.teams", { n: tr.teams }) : null].filter(Boolean).join(" · ")}</Text>
            </Card>
          ))}
        </>
      ) : null}

      {empty ? <EmptyState icon="trophy" title={t("wr.noMatches")} /> : null}
      <Text style={styles.source}>{t("wr.esportsSource")}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.bg },
  center:     { flex: 1, backgroundColor: colors.bg, justifyContent: "center", padding: spacing.lg },
  pad:        { paddingHorizontal: spacing.lg },
  content:    { paddingTop: spacing.md, paddingBottom: spacing.hero },
  gap:        { marginTop: spacing.md },
  live:       { padding: spacing.lg, overflow: "hidden", borderColor: withAlpha(colors.loss, 0.4), marginBottom: spacing.sm },
  split:      { ...StyleSheet.absoluteFillObject, flexDirection: "row" },
  half:       { flex: 1 },
  liveTop:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, marginBottom: spacing.md },
  liveInfo:   { ...type.micro, color: colors.textSecondary, flexShrink: 1 },
  games:      { flexDirection: "row", justifyContent: "center", gap: spacing.xs, marginTop: spacing.md },
  game:       { width: spacing.xl, height: spacing.xs, borderRadius: radii.xs, backgroundColor: colors.surfaceHigh },
  gameA:      { backgroundColor: colors.info },
  gameB:      { backgroundColor: colors.loss },
  watch:      { alignSelf: "center", marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.pill, backgroundColor: withAlpha(ACCENT, 0.18) },
  watchText:  { ...type.captionStrong, color: ACCENT },
  section:    { ...type.section, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  days:       { gap: spacing.xs, paddingBottom: spacing.sm },
  day:        { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md, borderWidth: sizes.hairline, borderColor: colors.border, backgroundColor: colors.surface },
  dayOn:      { borderColor: withAlpha(ACCENT, 0.6), backgroundColor: withAlpha(ACCENT, 0.16) },
  dayText:    { ...type.captionStrong, color: colors.textSecondary },
  dayTextOn:  { color: colors.text },
  item:       { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  itemTime:   { ...type.captionStrong, color: colors.textSecondary, width: sizes.avatarHero - spacing.lg, fontVariant: ["tabular-nums"] },
  itemTeams:  { flex: 1, gap: spacing.xs },
  itemTeam:   { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  itemName:   { ...type.smallStrong, color: colors.text, flex: 1 },
  itemScore:  { ...type.smallStrong, color: colors.textSecondary, fontVariant: ["tabular-nums"] },
  itemLeague: { ...type.micro, color: colors.textMuted, width: sizes.avatarHero, textAlign: "right" },
  winner:     { color: colors.win },
  sep:        { borderTopWidth: sizes.hairline, borderTopColor: colors.border },
  trophy:     { marginBottom: spacing.sm, borderColor: withAlpha(colors.tier.GOLD || ACCENT, 0.35) },
  trophyName: { ...type.bodyStrong, color: colors.text },
  trophySub:  { ...type.caption, color: colors.textSecondary, marginTop: spacing.xxs },
  source:     { ...type.micro, color: colors.textMuted, marginTop: spacing.lg },
});
