import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card, PressableScale } from "../../components/ui";
import Icon from "../../components/Icon";
import { LiveTag, MatchRow, TeamCrest } from "../wildrift/components";
import { countdown, fmtDate, fmtPrize, fmtShort, fmtTime, fmtWeekday, winnerOf } from "./api";
import { useT } from "../../i18n/I18nProvider";
import { accents, colors, fontSizes, radii, sizes, spacing, type, withAlpha } from "../../theme";

// Piezas del apartado de esports de Valorant. El escudo de equipo, el marcador y la etiqueta "En vivo" se reutilizan
// de Wild Rift (sin cambiarlos).
const ACCENT = accents.valorant;

/** Píldora pequeña (torneo, BO3) */
export function Pill({ text, tone = ACCENT, style }) {
  return <Text style={[styles.pill, { color: tone, borderColor: withAlpha(tone, 0.4), backgroundColor: withAlpha(tone, 0.12) }, style]} numberOfLines={1}>{text}</Text>;
}

/** El último campeón: ganador de la última gran final, con su rival y el marcador */
export function ChampionCard({ match, onPress }) {
  const t = useT();
  const w = winnerOf(match);
  if (!w) return null;
  return (
    <PressableScale onPress={onPress} haptic scaleTo={0.98} style={styles.champ} accessibilityRole="button" accessibilityLabel={t("val.championOf", { name: w.winner.name, event: match.serie || "" })}>
      <View style={styles.trophy} pointerEvents="none"><Icon name="trophy" size={sizes.iconHero} color={withAlpha(colors.gold, 0.18)} /></View>
      <Text style={styles.champLabel} numberOfLines={1}>{t("val.champion", { event: (match.serie || match.league?.name || "").toUpperCase() })}</Text>
      <View style={styles.champWho}>
        <TeamCrest team={w.winner} size={sizes.avatarLg + spacing.sm} />
        <View style={styles.flex}>
          <Text style={styles.champName} numberOfLines={1}>{w.winner.name}</Text>
          <Text style={styles.champSub}>{t("val.wonFinal", { date: fmtDate(match.beginAt) })}</Text>
        </View>
      </View>
      <View style={styles.champFoot}>
        <Text style={styles.champVs} numberOfLines={1}>{t("val.finalVs", { name: w.loser.name })}</Text>
        <Text style={styles.champScore}>{w.winner.score ?? "-"} – {w.loser.score ?? "-"}</Text>
      </View>
    </PressableScale>
  );
}

/** Próximo partido con cuenta atrás que avanza cada segundo */
export function NextMatchCard({ match, onPress }) {
  const t = useT();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const [a, b] = match.teams;
  const left = countdown(match.beginAt, now);
  return (
    <PressableScale onPress={onPress} haptic scaleTo={0.98} accessibilityRole="button">
      <Card style={styles.next}>
        <View style={styles.nextTop}>
          <Pill text={[match.serie, match.tournament].filter(Boolean).join(" · ").toUpperCase()} tone={colors.textSecondary} style={styles.flexShrink} />
          {match.bestOf ? <Text style={styles.bo}>BO{match.bestOf}</Text> : null}
        </View>
        <View style={styles.vs}>
          <View style={styles.vsTeam}><TeamCrest team={a} size={sizes.avatarLg + spacing.xs} /><Text style={styles.vsName} numberOfLines={2}>{a?.name || t("val.tbd")}</Text></View>
          <View style={styles.count}>
            <Text style={styles.countValue} numberOfLines={1} adjustsFontSizeToFit>{left || t("val.startingNow")}</Text>
            <Text style={styles.countSub} numberOfLines={1}>{`${fmtWeekday(match.beginAt)} · ${fmtTime(match.beginAt)}`.toUpperCase()}</Text>
          </View>
          <View style={styles.vsTeam}><TeamCrest team={b} size={sizes.avatarLg + spacing.xs} /><Text style={styles.vsName} numberOfLines={2}>{b?.name || t("val.tbd")}</Text></View>
        </View>
      </Card>
    </PressableScale>
  );
}

/** Partido en vivo, con el marcador de la serie */
export function LiveMatchCard({ match, onPress }) {
  const t = useT();
  return (
    <PressableScale onPress={onPress} haptic scaleTo={0.98} accessibilityRole="button">
      <Card style={styles.live}>
        <View style={styles.nextTop}>
          <LiveTag text={t("wr.live")} />
          <Text style={styles.liveInfo} numberOfLines={1}>{[match.serie, match.bestOf ? `BO${match.bestOf}` : null].filter(Boolean).join(" · ")}</Text>
        </View>
        <MatchRow match={match} compact />
      </Card>
    </PressableScale>
  );
}

/** Tarjeta de torneo: liga, nombre, fecha, equipos y premio */
export function TournamentCard({ tournament, style }) {
  const t = useT();
  const prize = fmtPrize(tournament.prize);
  return (
    <Card style={[styles.tour, style]}>
      <TeamCrest team={{ name: tournament.league?.name, acronym: tournament.league?.name }} size={sizes.avatarSm} />
      <Text style={styles.tourName} numberOfLines={2}>{[tournament.serie, tournament.stage].filter(Boolean).join(" · ") || tournament.name}</Text>
      <Text style={styles.tourSub} numberOfLines={1}>
        {[tournament.beginAt ? t("val.from", { date: fmtDate(tournament.beginAt) }) : null, tournament.teams ? t("wr.teams", { n: tournament.teams }) : null].filter(Boolean).join(" · ")}
      </Text>
      {prize ? <Text style={styles.prize}>{prize}</Text> : null}
    </Card>
  );
}

/** Fila de un partido en una lista: hora (o fecha), los dos equipos (con marcador si terminó) */
export function MatchItem({ match, onPress, showDate }) {
  const [a, b] = match.teams;
  const done = match.status === "finished";
  const won = tm => done && match.winnerId != null && match.winnerId === tm?.id;
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} style={styles.item} accessibilityRole="button" accessibilityLabel={`${a?.name || "?"} vs ${b?.name || "?"}`}>
      <View style={styles.itemTime}>
        <Text style={styles.itemHour}>{showDate ? fmtShort(match.beginAt) : fmtTime(match.beginAt)}</Text>
        {match.bestOf ? <Text style={styles.itemBo}>BO{match.bestOf}</Text> : null}
      </View>
      <View style={styles.flex}>
        {[a, b].map((tm, i) => (
          <View key={i} style={[styles.itemTeam, i && styles.itemGap]}>
            <TeamCrest team={tm} size={sizes.item} />
            <Text style={[styles.itemName, won(tm) && styles.winner]} numberOfLines={1}>{tm?.name || "—"}</Text>
            {done ? <Text style={[styles.itemScore, won(tm) && styles.winner]}>{tm?.score ?? "-"}</Text> : null}
          </View>
        ))}
      </View>
      <Icon name="chevron" size={fontSizes.md} color={colors.textMuted} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex:       { flex: 1 },
  flexShrink: { flexShrink: 1 },
  pill:       { ...type.micro, letterSpacing: 0.6, borderWidth: sizes.hairline, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, overflow: "hidden" },
  champ:      { padding: spacing.md, borderRadius: radii.xl, overflow: "hidden", borderWidth: sizes.hairline, borderColor: withAlpha(colors.gold, 0.4), backgroundColor: withAlpha(colors.gold, 0.08) },
  trophy:     { position: "absolute", right: -spacing.md, top: -spacing.md, transform: [{ rotate: "12deg" }] },
  champLabel: { ...type.micro, color: colors.gold, letterSpacing: 1.2 },
  champWho:   { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.sm },
  champName:  { ...type.title, color: colors.text },
  champSub:   { ...type.micro, color: colors.textSecondary },
  champFoot:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: sizes.hairline, borderTopColor: withAlpha(colors.text, 0.08) },
  champVs:    { ...type.caption, color: colors.textSecondary, flexShrink: 1 },
  champScore: { ...type.heading, color: colors.text, fontVariant: ["tabular-nums"] },
  next:       { gap: spacing.sm },
  nextTop:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  bo:         { ...type.micro, color: colors.textSecondary },
  vs:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  vsTeam:     { width: sizes.avatarHero, alignItems: "center", gap: spacing.xs },
  vsName:     { ...type.smallStrong, color: colors.text, textAlign: "center" },
  count:      { flex: 1, alignItems: "center" },
  countValue: { ...type.title, color: colors.text, fontVariant: ["tabular-nums"] },
  countSub:   { ...type.micro, color: colors.textMuted, letterSpacing: 0.6, marginTop: spacing.xxs },
  live:       { gap: spacing.sm, borderColor: withAlpha(colors.loss, 0.4) },
  liveInfo:   { ...type.micro, color: colors.textSecondary, flexShrink: 1 },
  tour:       { width: sizes.chart * 1.45, gap: spacing.xs },
  tourName:   { ...type.smallStrong, color: colors.text, marginTop: spacing.xs },
  tourSub:    { ...type.micro, color: colors.textSecondary },
  prize:      { ...type.captionStrong, color: colors.gold },
  item:       { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  itemTime:   { width: sizes.avatarHero - spacing.md },
  itemHour:   { ...type.captionStrong, color: colors.text, fontVariant: ["tabular-nums"] },
  itemBo:     { ...type.micro, color: colors.textMuted },
  itemTeam:   { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  itemGap:    { marginTop: spacing.xs },
  itemName:   { ...type.smallStrong, color: colors.text, flex: 1 },
  itemScore:  { ...type.smallStrong, color: colors.textSecondary, fontVariant: ["tabular-nums"] },
  winner:     { color: colors.win },
});
