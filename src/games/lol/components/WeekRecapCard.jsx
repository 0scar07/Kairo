import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import Icon from "../../../components/Icon";
import { PressCard, KenBurnsImage, Shine } from "../../../news/fx";
import { championLabel, championSplash } from "../../../api/ddragon";
import { useT } from "../../../i18n/I18nProvider";
import { tierLabel } from "../../../utils/format";
import { gamesSince, loadWeekState, lpChange, rankScore, weekRecap } from "../week";
import { accents, colors, fonts, radii, sizes, spacing, type, withAlpha } from "../../../theme";

const WEEK_MS = 7 * 86_400_000;

/**
 * Tarjeta "Tu semana" de Mi perfil (LoL): el arte de tu campeón de la semana con un brillo que la cruza, y lo esencial
 * (partidas, victorias, LP). Al tocarla se abre la historia completa (WeekRecapScreen). Con menos de 3 partidas en los
 * últimos 7 días no aparece.
 */
export default function WeekRecapCard({ data }) {
  const t = useT();
  const navigation = useNavigation();
  const { account, ranked, matches } = data;
  const solo = ranked?.find(r => r.queueType === "RANKED_SOLO_5x5") || null;
  const [snaps, setSnaps] = useState(null);
  useEffect(() => { loadWeekState(account.puuid).then(s => setSnaps(s.snaps)); }, [account.puuid, solo?.leaguePoints]);

  const since = Date.now() - WEEK_MS;
  const recap = useMemo(() => {
    if (!snaps) return null;
    return weekRecap(gamesSince(matches, account.puuid, since), lpChange(snaps, since, rankScore(solo)));
  }, [snaps, matches]);
  if (!recap) return null;

  const open = () => navigation.navigate("WeekRecap", {
    recap: { ...recap, from: since, to: Date.now() }, name: `${account.gameName} #${account.tagLine}`, tier: solo ? tierLabel(solo.tier, solo.rank) : null,
  });
  const lp = recap.lp == null ? null : `${recap.lp > 0 ? "+" : ""}${recap.lp} LP`;

  return (
    <PressCard onPress={open} style={styles.card} label={t("recap.open")}>
      <KenBurnsImage uri={championSplash(recap.top.name)} style={styles.art} />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <LinearGradient id="recapCard" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={colors.bg} stopOpacity="0.96" />
            <Stop offset="0.55" stopColor={colors.bg} stopOpacity="0.7" />
            <Stop offset="1" stopColor={colors.bg} stopOpacity="0.1" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#recapCard)" />
      </Svg>
      <Shine />
      <View style={styles.body}>
        <Text style={styles.kicker}>{t("recap.kicker")}</Text>
        <Text style={styles.title} numberOfLines={1}>{lp || t("recap.gamesCount", { count: recap.games })}</Text>
        <Text style={styles.sub} numberOfLines={1}>{t("recap.cardLine", { games: recap.games, wr: recap.wr, champ: championLabel(recap.top.name) })}</Text>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>{t("recap.open")}</Text>
          <Icon name="chevron" size={sizes.item - spacing.md} color={colors.bg} />
        </View>
      </View>
    </PressCard>
  );
}

const styles = StyleSheet.create({
  card:    { height: sizes.chart + spacing.xxxl + spacing.md, borderRadius: radii.xl, overflow: "hidden", marginBottom: spacing.lg, backgroundColor: colors.surface, borderWidth: sizes.hairline, borderColor: withAlpha(accents.lol, 0.35) },
  art:     { left: "30%" },
  body:    { flex: 1, padding: spacing.lg, justifyContent: "center" },
  kicker:  { ...type.micro, color: accents.lol, letterSpacing: 2.4, fontFamily: fonts.bodyBold },
  title:   { fontFamily: fonts.displayHeavy, fontSize: 32, color: colors.text, marginTop: spacing.xs, letterSpacing: -0.8 },
  sub:     { ...type.small, color: colors.textSecondary, marginTop: spacing.xxs },
  cta:     { flexDirection: "row", alignItems: "center", gap: spacing.xxs, alignSelf: "flex-start", marginTop: spacing.md, paddingLeft: spacing.md, paddingRight: spacing.sm, paddingVertical: spacing.xs + 1, borderRadius: radii.pill, backgroundColor: colors.text },
  ctaText: { ...type.captionStrong, color: colors.bg },
});
