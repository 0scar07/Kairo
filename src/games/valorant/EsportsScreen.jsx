import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, RefreshControl, StyleSheet } from "react-native";
import { Card, EmptyState, ErrorState, PressableScale, SegmentedTabs, Skeleton } from "../../components/ui";
import { TeamCrest } from "../wildrift/components";
import { MatchItem, TournamentCard } from "./components";
import { dayKey, getEsports } from "./api";
import { useT } from "../../i18n/I18nProvider";
import { activeLanguage } from "../../i18n";
import { errorMessage } from "../../utils/format";
import { select } from "../../utils/haptics";
import { accents, colors, radii, sizes, spacing, type, withAlpha } from "../../theme";

const ACCENT = accents.valorant;

/** Agrupa partidos por torneo (serie + fase), en el orden en que aparecen */
function byTournament(matches) {
  const groups = new Map();
  for (const m of matches) {
    const key = [m.serie, m.tournament].filter(Boolean).join(" · ") || m.league?.name || "—";
    if (!groups.has(key)) groups.set(key, { key, league: m.league, matches: [] });
    groups.get(key).matches.push(m);
  }
  return [...groups.values()];
}

function Group({ group, onOpen, showDate, t }) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHead}>
        <TeamCrest team={{ name: group.league?.name, acronym: group.league?.name }} size={sizes.avatarXs + spacing.xxs} />
        <Text style={styles.groupName} numberOfLines={1}>{group.key}</Text>
        <Text style={styles.groupCount}>{group.matches.length === 1 ? t("val.oneMatch") : t("val.matches", { n: group.matches.length })}</Text>
      </View>
      <Card padded={false}>
        {group.matches.map((m, i) => <View key={m.id} style={i ? styles.sep : null}><MatchItem match={m} showDate={showDate} onPress={() => onOpen(m)} /></View>)}
      </Card>
    </View>
  );
}

/**
 * Calendario de Valorant en tres pestañas: próximos (por día), resultados y torneos. Cada partido abre su detalle.
 */
export default function EsportsScreen({ navigation }) {
  const t = useT();
  const [state, setState] = useState({ status: "loading" });
  const [tab, setTab] = useState("upcoming");
  const [day, setDay] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    getEsports()
      .then(data => { if (alive) setState({ status: "ready", data }); })
      .catch(e => { if (alive) setState({ status: "error", message: errorMessage(e) }); })
      .finally(() => { if (alive) setRefreshing(false); });
    return () => { alive = false; };
  }, [attempt]);

  const data = state.data;
  // Días con partidos (en vivo cuenta como hoy), hasta dos semanas de botones
  const days = useMemo(() => {
    const seen = new Map();
    for (const m of [...(data?.running || []), ...(data?.upcoming || [])]) {
      if (m.beginAt && !seen.has(dayKey(m.beginAt))) seen.set(dayKey(m.beginAt), m.beginAt);
    }
    return [...seen.entries()].slice(0, 14);
  }, [data]);
  const current = day && days.some(([k]) => k === day) ? day : days[0]?.[0];
  const ofDay = [...(data?.running || []), ...(data?.upcoming || [])].filter(m => dayKey(m.beginAt) === current);
  const open = m => navigation.navigate("VALMatch", { id: m.id });

  if (state.status === "loading") {
    return <View style={[styles.container, styles.pad]}>{[0, 1, 2].map(i => <Skeleton key={i} height={sizes.chart} radius={radii.lg} style={styles.gap} />)}</View>;
  }
  if (state.status === "error") return <View style={styles.center}><ErrorState message={state.message} onRetry={() => setAttempt(n => n + 1)} /></View>;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.pad, styles.content]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setAttempt(n => n + 1); }} tintColor={ACCENT} />}
    >
      <SegmentedTabs
        game="valorant"
        value={tab}
        onChange={setTab}
        tabs={[{ key: "upcoming", label: t("val.tabUpcoming") }, { key: "results", label: t("val.tabResults") }, { key: "tournaments", label: t("val.tabTournaments") }]}
      />

      {tab === "upcoming" ? (
        days.length ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
              {days.map(([k, iso]) => {
                const on = k === current;
                const d = new Date(iso);
                return (
                  <PressableScale key={k} onPress={() => { select(); setDay(k); }} style={[styles.day, on && styles.dayOn]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
                    <Text style={[styles.dayWeek, on && { color: ACCENT }]}>{d.toLocaleDateString(activeLanguage(), { weekday: "short" }).toUpperCase()}</Text>
                    <Text style={[styles.dayNum, on && styles.dayNumOn]}>{d.getDate()}</Text>
                  </PressableScale>
                );
              })}
            </ScrollView>
            {byTournament(ofDay).map(g => <Group key={g.key} group={g} onOpen={open} t={t} />)}
          </>
        ) : <EmptyState icon="trophy" title={t("wr.noMatches")} />
      ) : tab === "results" ? (
        data.past.length ? byTournament(data.past).map(g => <Group key={g.key} group={g} onOpen={open} showDate t={t} />) : <EmptyState icon="trophy" title={t("wr.noMatches")} />
      ) : (
        data.tournaments.length ? (
          <View style={styles.tours}>{data.tournaments.map(tr => <TournamentCard key={tr.id} tournament={tr} style={styles.tour} />)}</View>
        ) : <EmptyState icon="trophy" title={t("val.noTournaments")} />
      )}

      <Text style={styles.source}>{t("val.calendarNote")}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center:    { flex: 1, backgroundColor: colors.bg, justifyContent: "center", padding: spacing.lg },
  pad:       { paddingHorizontal: spacing.lg },
  content:   { paddingTop: spacing.sm, paddingBottom: spacing.hero },
  gap:       { marginTop: spacing.md },
  days:      { gap: spacing.xs, paddingTop: spacing.md },
  day:       { width: sizes.avatarHero - spacing.lg, height: sizes.avatarHero - spacing.xl, alignItems: "center", justifyContent: "center", borderRadius: radii.lg, borderWidth: sizes.hairline, borderColor: colors.border, backgroundColor: colors.surface },
  dayOn:     { borderColor: withAlpha(ACCENT, 0.7), backgroundColor: withAlpha(ACCENT, 0.14) },
  dayWeek:   { ...type.micro, color: colors.textMuted, letterSpacing: 0.6 },
  dayNum:    { ...type.heading, color: colors.textSecondary, fontVariant: ["tabular-nums"] },
  dayNumOn:  { color: colors.text },
  group:     { marginTop: spacing.md },
  groupHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs },
  groupName: { ...type.captionStrong, color: colors.textSecondary, flex: 1 },
  groupCount:{ ...type.micro, color: colors.textMuted },
  sep:       { borderTopWidth: sizes.hairline, borderTopColor: colors.border },
  tours:     { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  tour:      { width: "48%" },
  source:    { ...type.micro, color: colors.textMuted, marginTop: spacing.lg },
});
