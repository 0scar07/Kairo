import React from "react";
import { useT } from "../../i18n/I18nProvider";
import { View, Text, Image, StyleSheet } from "react-native";
import Reveal from "../../components/Reveal";
import { Card, SectionLabel, StatGrid, ProgressBar } from "../../components/ui";
import { formatNumber } from "../../utils/format";
import { clanRole } from "../../utils/supercell";
import { colors, radii, sizes, spacing, type, useAccent } from "../../theme";

const GAME = "clashofclans";

function HeroRow({ hero, color }) {
  const t = useT();
  const pct = hero.maxLevel ? (hero.level / hero.maxLevel) * 100 : 0;
  return (
    <View style={styles.hero}>
      <View style={styles.heroHeader}>
        <Text style={styles.heroName} numberOfLines={1}>{hero.name}</Text>
        <Text style={styles.heroLevel}>{t("common.level", { level: hero.level })}<Text style={styles.heroMax}> / {hero.maxLevel}</Text></Text>
      </View>
      <ProgressBar value={pct} color={color} />
    </View>
  );
}

// Contenido del perfil de Clash of Clans (la cabecera, favoritos y refresco los pone el perfil genérico)
export default function ClashOfClansProfileBody({ data }) {
  const t = useT();
  const accent = useAccent(GAME);
  const { player } = data;
  const heroes = player.heroes || [];
  const homeHeroes = heroes.filter(h => h.village !== "builderBase");
  const builderHeroes = heroes.filter(h => h.village === "builderBase");
  const clan = player.clan;

  return (
    <>
      <Reveal order={1}>
        <StatGrid
          label={t("sc.summary")}
          icon="trophy"
          items={[
            { label: t("coc.townHall"), value: player.townHallLevel, color: accent },
            { label: t("sc.trophies"), value: formatNumber(player.trophies) },
            { label: t("sc.record"), value: formatNumber(player.bestTrophies) },
          ]}
        />
      </Reveal>

      <Reveal order={2}>
        <StatGrid
          label={t("coc.warAndClan")}
          icon="award"
          items={[
            { label: t("coc.stars"), value: formatNumber(player.warStars) },
            { label: t("coc.attacks"), value: formatNumber(player.attackWins), color: colors.win },
            { label: t("coc.defenses"), value: formatNumber(player.defenseWins) },
            { label: t("coc.donated"), value: formatNumber(player.donations) },
            { label: t("coc.received"), value: formatNumber(player.donationsReceived) },
            { label: t("sc.level"), value: player.expLevel },
          ]}
        />
      </Reveal>

      {clan && (
        <Reveal order={3}>
          <Card>
            <SectionLabel icon="shield">{t("coc.clan")}</SectionLabel>
            <View style={styles.clan}>
              {clan.badgeUrls?.small
                ? <Image source={{ uri: clan.badgeUrls.small }} style={styles.badge} resizeMode="contain" />
                : null}
              <View style={styles.clanInfo}>
                <Text style={styles.clanName} numberOfLines={1}>{clan.name}</Text>
                <Text style={styles.clanSub}>
                  {[clanRole(player.role), clan.clanLevel ? t("coc.clanLevel", { level: clan.clanLevel }) : null].filter(Boolean).join(" · ")}
                </Text>
              </View>
            </View>
          </Card>
        </Reveal>
      )}

      {homeHeroes.length > 0 && (
        <Reveal order={4}>
          <Card>
            <SectionLabel icon="crown">{t("coc.heroes")}</SectionLabel>
            {homeHeroes.map(h => <HeroRow key={h.name} hero={h} color={accent} />)}
          </Card>
        </Reveal>
      )}

      {(player.builderHallLevel || builderHeroes.length > 0) && (
        <Reveal order={5}>
          <Card>
            <SectionLabel icon="tool">{t("coc.builderBase")}</SectionLabel>
            <View style={styles.builderStats}>
              {player.builderHallLevel ? <Text style={styles.builderText}>{t("coc.builderHall", { level: player.builderHallLevel })}</Text> : null}
              {player.builderBaseTrophies != null ? <Text style={styles.builderText}>{t("coc.trophies", { n: formatNumber(player.builderBaseTrophies) })}</Text> : null}
            </View>
            {builderHeroes.map(h => <HeroRow key={h.name} hero={h} color={accent} />)}
          </Card>
        </Reveal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  hero:         { marginBottom: spacing.md },
  heroHeader:   { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: spacing.xs },
  heroName:     { ...type.bodyStrong, color: colors.text, flex: 1 },
  heroLevel:    { ...type.smallStrong, color: colors.text },
  heroMax:      { color: colors.textMuted },
  clan:         { flexDirection: "row", alignItems: "center", gap: spacing.md },
  badge:        { width: sizes.avatarXl - spacing.md, height: sizes.avatarXl - spacing.md, borderRadius: radii.md },
  clanInfo:     { flex: 1, minWidth: 0 },
  clanName:     { ...type.heading, color: colors.text },
  clanSub:      { ...type.caption, color: colors.textMuted },
  builderStats: { marginBottom: spacing.md, gap: spacing.xs },
  builderText:  { ...type.body, color: colors.textSecondary },
});
