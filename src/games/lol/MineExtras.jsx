import React from "react";
import { useT } from "../../i18n/I18nProvider";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";
import Reveal from "../../components/Reveal";
import Icon from "../../components/Icon";
import { Card, SectionLabel } from "../../components/ui";
import { findMe } from "./utils";
import { t } from "../../i18n";
import { winrate } from "../../utils/format";
import {
  colors, accents, radii, sizes, spacing, fontSizes, type, winrateColor, useAccent, withAlpha,
} from "../../theme";

const GAME = "lol";
const CHART_WIDTH = Dimensions.get("window").width - spacing.xl - spacing.xxl - spacing.lg;

function getBadges(me) {
  const badges = [];
  if (!me.length) return badges;
  const avgKda     = me.reduce((a, p) => a + (p.deaths === 0 ? 5 : (p.kills + p.assists) / p.deaths), 0) / me.length;
  const avgDmg     = me.reduce((a, p) => a + p.totalDamageDealtToChampions, 0) / me.length;
  const wr         = (me.filter(p => p.win).length / me.length) * 100;
  const pentakills = me.reduce((a, p) => a + (p.pentaKills || 0), 0);
  const byChamp    = {};
  me.forEach(p => { (byChamp[p.championName] = byChamp[p.championName] || []).push(p.win); });
  const top        = Object.values(byChamp).sort((a, b) => b.length - a.length)[0];
  const topWr      = top ? (top.filter(Boolean).length / top.length) * 100 : 0;
  if (avgKda >= 4)     badges.push({ icon: "zap", label: t("badges.kda"),    color: colors.gold });
  if (avgDmg >= 25000) badges.push({ icon: "target", label: t("badges.damage"),  color: colors.loss });
  if (wr >= 60)        badges.push({ icon: "trophy", label: t("badges.wins"), color: colors.win });
  if (pentakills > 0)  badges.push({ icon: "crown", label: t("badges.penta"),      color: accents.lol });
  if (topWr >= 65)     badges.push({ icon: "award",  label: t("badges.oneTrick"),      color: colors.info });
  if (me.length >= 20) badges.push({ icon: "flame", label: t("badges.grinder"),        color: colors.orange });
  return badges;
}

function Badge({ badge }) {
  return (
    <View style={[styles.badge, { borderColor: badge.color }]}>
      <Icon name={badge.icon} size={fontSizes.base} color={badge.color} />
      <Text style={[styles.badgeLabel, { color: badge.color }]}>{badge.label}</Text>
    </View>
  );
}

// Extras de "Mi perfil" en LoL: insignias, estadísticas generales y gráfico de KDA
export default function MineExtras({ data }) {
  const t = useT();
  const accent = useAccent(GAME);
  const { account, matches } = data;
  const me     = (matches || []).map(m => findMe(m, account.puuid)).filter(Boolean);
  const badges = getBadges(me);
  const wins   = me.filter(p => p.win).length;
  const wr     = winrate(wins, me.length - wins);
  const avg    = key => (me.length ? (me.reduce((a, p) => a + p[key], 0) / me.length).toFixed(1) : 0);
  const avgDmg = me.length ? Math.round(me.reduce((a, p) => a + p.totalDamageDealtToChampions, 0) / me.length / 1000) : 0;
  const bestKda = me.reduce((best, p) => {
    const kda = p.deaths === 0 ? 99 : (p.kills + p.assists) / p.deaths;
    return kda > best ? kda : best;
  }, 0).toFixed(1);

  const chartData = {
    labels: me.slice(-10).map(() => ""),
    datasets: [{
      data: me.slice(-10).map(p => (p.deaths === 0 ? 5 : parseFloat(((p.kills + p.assists) / p.deaths).toFixed(1)))),
      color: (opacity = 1) => withAlpha(accent, opacity),
      strokeWidth: 2,
    }],
  };

  const statBoxes = [
    { label: t("stats.winrate"), value: `${wr}%`,                                             color: winrateColor(wr, accent) },
    { label: t("stats.avgKda"), value: `${avg("kills")}/${avg("deaths")}/${avg("assists")}`, color: colors.text },
    { label: t("stats.bestKda"), value: bestKda,                                              color: colors.gold },
    { label: t("stats.avgDamage"), value: `${avgDmg}k`,                                         color: colors.loss },
    { label: t("results.wins"), value: wins,                                                 color: colors.win },
    { label: t("stats.matches"), value: me.length,                                            color: colors.text },
  ];

  return (
    <>
      {badges.length > 0 && (
        <Reveal order={3}>
          <Card>
            <SectionLabel icon="award">{t("lol.badges")}</SectionLabel>
            <View style={styles.badgesRow}>
              {badges.map(b => <Badge key={b.label} badge={b} />)}
            </View>
          </Card>
        </Reveal>
      )}

      <Reveal order={3}>
        <Card>
          <SectionLabel icon="barChart">{t("lol.generalStats")}</SectionLabel>
          <View style={styles.statsGrid}>
            {statBoxes.map(s => (
              <View key={s.label} style={styles.statBox}>
                <Text style={[styles.statNum, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label.toUpperCase()}</Text>
              </View>
            ))}
          </View>
        </Card>
      </Reveal>

      {me.length >= 3 && (
        <Reveal order={4}>
          <Card>
            <SectionLabel icon="trending">{t("lol.kdaLast", { count: Math.min(me.length, 10) })}</SectionLabel>
            <LineChart
              data={chartData}
              width={CHART_WIDTH}
              height={sizes.chart}
              chartConfig={{
                backgroundColor: colors.surface,
                backgroundGradientFrom: colors.surface,
                backgroundGradientTo: colors.surface,
                decimalPlaces: 1,
                color: (opacity = 1) => withAlpha(accent, opacity),
                labelColor: () => colors.textMuted,
                propsForDots: { r: "4" },
              }}
              bezier
              style={{ borderRadius: radii.md }}
              withHorizontalLabels
              withVerticalLabels={false}
              withDots
              withInnerLines={false}
              withOuterLines={false}
            />
          </Card>
        </Reveal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  badgesRow:  { flexDirection: "row", flexWrap: "wrap" },
  badge:      {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radii.pill, borderWidth: sizes.hairline,
    backgroundColor: colors.bg, marginRight: spacing.sm, marginBottom: spacing.sm,
  },
  badgeLabel: { ...type.smallStrong },
  statsGrid:  { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  statBox:    {
    flex: 1, minWidth: "28%", alignItems: "center",
    backgroundColor: colors.bg, borderRadius: radii.md, padding: spacing.md,
    borderWidth: sizes.hairline, borderColor: colors.border,
  },
  statNum:    { ...type.heading, letterSpacing: 0 },
  statLabel:  { ...type.label, color: colors.textMuted, marginTop: spacing.xs },
});
