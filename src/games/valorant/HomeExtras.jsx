import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Skeleton } from "../../components/ui";
import { ChampionCard, LiveMatchCard, NextMatchCard, TournamentCard } from "./components";
import { getEsports } from "./api";
import { useT } from "../../i18n/I18nProvider";
import { errorMessage } from "../../utils/format";
import { accents, colors, radii, sizes, spacing, type } from "../../theme";

const ACCENT = accents.valorant;

/**
 * Inicio de Valorant (sin buscador: los perfiles de jugador necesitan una key de Riot que aún no está aprobada).
 * Arriba el partido en vivo o, si no hay, el último campeón; luego la cuenta atrás del próximo partido y los torneos.
 */
export default function ValorantHomeExtras() {
  const t = useT();
  const navigation = useNavigation();
  const [data, setData] = useState(null);   // null = cargando · { error } si falló
  useEffect(() => {
    let alive = true;
    getEsports().then(d => { if (alive) setData(d); }).catch(e => { if (alive) setData({ error: errorMessage(e) }); });
    return () => { alive = false; };
  }, []);

  const openMatch = m => navigation.navigate("VALMatch", { id: m.id });
  const openCalendar = () => navigation.navigate("VALEsports");
  const live = data?.running?.[0];
  const next = data?.upcoming?.find(m => m.teams.length === 2) || data?.upcoming?.[0];

  return (
    <View>
      <View style={styles.intro}>
        <Text style={styles.title}>VALO<Text style={{ color: ACCENT }}>RANT</Text></Text>
        <Text style={styles.sub}>{t("val.tagline")}</Text>
      </View>

      {data === null ? (
        <>
          <Skeleton height={sizes.chart * 1.15} radius={radii.xl} />
          <Skeleton height={sizes.chart * 1.15} radius={radii.lg} style={styles.gap} />
        </>
      ) : data.error ? (
        <Text style={styles.note}>{data.error}</Text>
      ) : (
        <>
          {live ? <LiveMatchCard match={live} onPress={() => openMatch(live)} /> : data.champion ? <ChampionCard match={data.champion} onPress={() => openMatch(data.champion)} /> : null}

          {next ? (
            <>
              <View style={styles.sectionRow}>
                <Text style={styles.section}>{t("val.nextMatch")}</Text>
                <Text style={styles.link} onPress={openCalendar} accessibilityRole="link">{t("val.calendar")} ›</Text>
              </View>
              <NextMatchCard match={next} onPress={() => openMatch(next)} />
            </>
          ) : null}

          {data.tournaments?.length ? (
            <>
              <Text style={styles.section}>{t("val.tournaments")}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tours}>
                {data.tournaments.slice(0, 6).map(tr => <TournamentCard key={tr.id} tournament={tr} />)}
              </ScrollView>
            </>
          ) : null}
        </>
      )}
      <Text style={styles.source}>{t("val.source")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  intro:      { marginBottom: spacing.md },
  title:      { ...type.largeTitle, color: colors.text },
  sub:        { ...type.caption, color: colors.textSecondary, marginTop: spacing.xxs },
  gap:        { marginTop: spacing.md },
  sectionRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  section:    { ...type.section, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  link:       { ...type.captionStrong, color: ACCENT },
  tours:      { gap: spacing.sm, paddingRight: spacing.sm },
  note:       { ...type.caption, color: colors.textMuted },
  source:     { ...type.micro, color: colors.textMuted, marginTop: spacing.md },
});
