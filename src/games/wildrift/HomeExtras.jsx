import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Image, ScrollView, Linking, StyleSheet } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Card, PressableScale, Skeleton } from "../../components/ui";
import Icon from "../../components/Icon";
import { ArtTile, LiveTag, MatchRow, Portrait, Shade, TierBadge } from "./components";
import { LANES, LANE_LABEL, champIcon, champName, champSplash, championsOf, getEsports, getMeta, getNews, loadMains } from "./api";
import { useI18n } from "../../i18n/I18nProvider";
import { activeLanguage } from "../../i18n";
import { championSplash } from "../../api/ddragon";
import { accents, colors, fontSizes, radii, sizes, spacing, type, withAlpha } from "../../theme";

const ACCENT = accents.wildrift;
const RECENT_MS = 30 * 24 * 60 * 60 * 1000;
const MOVERS = 6;

// Hay esports que mostrar si algo está en vivo, viene en camino o se jugó en los últimos 30 días
const hasRecent = e => Boolean(e?.running?.length || e?.upcoming?.length
  || (e?.past || []).some(m => m.beginAt && Date.now() - new Date(m.beginAt).getTime() < RECENT_MS));

/** Los que suben (o bajan) de winrate hoy: la fuente solo da la dirección, así que se ordenan por winrate */
function movers(champs, dir) {
  return champs
    .filter(c => c.trend === dir)
    .sort((a, b) => (dir > 0 ? (b.winRate ?? 0) - (a.winRate ?? 0) : (a.winRate ?? 0) - (b.winRate ?? 0)))
    .slice(0, MOVERS);
}

/** Atajo pequeño con ícono (buscador, comparador) */
function Shortcut({ icon, label, onPress }) {
  return (
    <PressableScale onPress={onPress} haptic scaleTo={0.96} style={styles.shortcut} accessibilityRole="button" accessibilityLabel={label}>
      <Icon name={icon} size={fontSizes.lg} color={ACCENT} />
      <Text style={styles.shortcutText} numberOfLines={1}>{label}</Text>
    </PressableScale>
  );
}

/**
 * Inicio de Wild Rift (no tiene buscador de jugadores: Wild Rift no publica perfiles). Lo principal es la tier list;
 * debajo, atajos al buscador de campeones y al comparador, "Mis mains", el top del parche, los que suben y bajan,
 * y las últimas notas del parche. El acceso a esports solo aparece si hubo partidos en los últimos 30 días.
 */
export default function WildRiftHomeExtras() {
  const { t, language } = useI18n();
  const navigation = useNavigation();
  const [meta, setMeta] = useState(null);        // null = cargando · false = error
  const [live, setLive] = useState(null);        // partido en vivo, si lo hay
  const [esports, setEsports] = useState(false); // si hay esports recientes que mostrar
  const [mains, setMains] = useState([]);
  const [patch, setPatch] = useState(null);      // últimas notas del parche

  useEffect(() => {
    let alive = true;
    getMeta("diamond").then(m => { if (alive) setMeta(m); }).catch(() => { if (alive) setMeta(false); });
    getEsports().then(e => { if (alive) { setLive(e.running?.[0] || null); setEsports(hasRecent(e)); } }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    getNews(language).then(n => { if (alive) setPatch(n.items?.find(i => i.patch) || null); }).catch(() => {});
    return () => { alive = false; };
  }, [language]);

  // Al volver de la ficha de un campeón puede haber un main nuevo
  useFocusEffect(useCallback(() => { loadMains().then(setMains); }, []));

  const open = c => navigation.navigate("WRChampion", { heroId: c.heroId, lane: c.lane });
  // El primero de cada carril (la fuente ya viene ordenada por fuerza)
  const tops = meta ? LANES.map(lane => meta.lanes[lane]?.[0] ? { lane, ...meta.lanes[lane][0] } : null).filter(Boolean) : [];
  const champs = meta ? championsOf(meta) : [];
  const myMains = mains.map(id => champs.find(c => c.heroId === id)).filter(Boolean);
  const up = movers(champs, 1);
  const down = movers(champs, -1);

  return (
    <View>
      <View style={styles.intro}>
        <Text style={styles.title}>Wild <Text style={{ color: ACCENT }}>Rift</Text></Text>
        <Text style={styles.sub}>{meta?.date ? t("wr.updated", { date: meta.date }) : t("wr.tagline")}</Text>
      </View>

      <View style={styles.actions}>
        <ArtTile uri={championSplash("Ahri")} onPress={() => navigation.navigate("WRTierList")} style={[styles.action, !esports && styles.actionMain]} label={t("wr.tierList")}>
          <Text style={styles.actionTitle}>{t("wr.tierList")}</Text>
          <Text style={styles.actionSub}>{t("wr.tierListSub")}</Text>
        </ArtTile>
        {esports ? (
          <ArtTile uri={championSplash("LeeSin")} onPress={() => navigation.navigate("WREsports")} style={styles.action} label={t("wr.esports")}>
            <Text style={styles.actionTitle}>{t("wr.esports")}</Text>
            <Text style={styles.actionSub}>{live ? t("wr.liveNow") : t("wr.esportsSub")}</Text>
          </ArtTile>
        ) : null}
      </View>

      <View style={styles.shortcuts}>
        <Shortcut icon="search" label={t("wr.findChamp")} onPress={() => navigation.navigate("WRChampions")} />
        <Shortcut icon="compare" label={t("wr.compare")} onPress={() => navigation.navigate("WRChampions", { pick: "compareA" })} />
      </View>

      {live ? (
        <>
          <Text style={styles.section}>{t("wr.liveTitle")}</Text>
          <Card style={styles.live} padded={false}>
            <View style={styles.liveTop}>
              <LiveTag text={t("wr.live")} />
              <Text style={styles.liveInfo} numberOfLines={1}>{live.league?.name || live.tournament || ""}</Text>
            </View>
            <MatchRow match={live} compact />
          </Card>
        </>
      ) : null}

      {myMains.length ? (
        <>
          <Text style={styles.section}>{t("wr.myMains")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {myMains.map(c => (
              <Portrait key={c.heroId} uri={champIcon(c)} tier={c.tier} label={champName(c)} sub={`${c.winRate?.toFixed(1)}%`} onPress={() => open(c)} />
            ))}
          </ScrollView>
        </>
      ) : null}

      <Text style={styles.section}>{t("wr.topTitle")}</Text>
      {meta === null ? (
        <View style={styles.tops}>{[0, 1, 2].map(i => <Skeleton key={i} height={sizes.iconHero} radius={radii.xl} style={styles.topCard} />)}</View>
      ) : meta === false ? (
        <Text style={styles.note}>{t("wr.loadError")}</Text>
      ) : (
        <View style={styles.tops}>
          {tops.slice(0, 3).map(c => (
            <ArtTile key={c.lane} uri={champSplash(c)} onPress={() => open(c)} style={styles.topCard} label={champName(c)}>
              <TierBadge tier={c.tier} style={styles.topTier} />
              <Text style={styles.topName} numberOfLines={1}>{champName(c)}</Text>
              <Text style={styles.topSub} numberOfLines={1}>{`${c.winRate?.toFixed(1)}% · ${t(LANE_LABEL[c.lane])}`}</Text>
            </ArtTile>
          ))}
        </View>
      )}

      {up.length || down.length ? (
        <>
          <Text style={styles.section}>{t("wr.movers")}</Text>
          <Card padded={false} style={styles.movers}>
            {[[up, 1], [down, -1]].map(([list, dir]) => list.length ? (
              <View key={dir} style={dir < 0 ? styles.moversSep : null}>
                <Text style={[styles.moversLabel, { color: dir > 0 ? colors.win : colors.loss }]}>{dir > 0 ? `▲ ${t("wr.rising")}` : `▼ ${t("wr.falling")}`}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                  {list.map(c => (
                    <Portrait key={c.heroId} uri={champIcon(c)} label={champName(c)} sub={`${c.winRate?.toFixed(1)}%`} subColor={dir > 0 ? colors.win : colors.loss} onPress={() => open(c)} />
                  ))}
                </ScrollView>
              </View>
            ) : null)}
          </Card>
        </>
      ) : null}

      {patch ? (
        <>
          <Text style={styles.section}>{t("wr.patchTitle")}</Text>
          <PressableScale onPress={() => Linking.openURL(patch.url)} haptic scaleTo={0.98} style={styles.patch} accessibilityRole="link" accessibilityLabel={patch.title}>
            {patch.image ? <Image source={{ uri: patch.image }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
            <Shade from={0.1} to={0.95} />
            <View style={styles.patchBody}>
              <Text style={styles.patchTitle} numberOfLines={2}>{patch.title}</Text>
              <Text style={styles.patchSub}>{new Date(patch.date).toLocaleDateString(activeLanguage(), { day: "numeric", month: "long" })} · {t("wr.readOfficial")} ›</Text>
            </View>
          </PressableScale>
        </>
      ) : null}

      <Text style={styles.source}>{t("wr.source")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  intro:       { marginBottom: spacing.md },
  title:       { ...type.largeTitle, color: colors.text },
  sub:         { ...type.caption, color: colors.textSecondary, marginTop: spacing.xxs },
  actions:     { flexDirection: "row", gap: spacing.sm },
  action:      { flex: 1, height: sizes.iconHero },
  actionMain:  { height: sizes.chart * 1.3 },
  actionTitle: { ...type.heading, color: colors.text },
  actionSub:   { ...type.micro, color: colors.textSecondary },
  shortcuts:   { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  shortcut:    { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, height: sizes.avatarLg + spacing.xs, borderRadius: radii.lg, borderWidth: sizes.hairline, borderColor: withAlpha(ACCENT, 0.35), backgroundColor: withAlpha(ACCENT, 0.08) },
  shortcutText:{ ...type.captionStrong, color: colors.text },
  section:     { ...type.section, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  live:        { padding: spacing.md, borderColor: withAlpha(colors.loss, 0.35) },
  liveTop:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm, gap: spacing.sm },
  liveInfo:    { ...type.micro, color: colors.textSecondary, flexShrink: 1 },
  row:         { gap: spacing.xs, paddingRight: spacing.sm },
  tops:        { flexDirection: "row", gap: spacing.sm },
  topCard:     { flex: 1, height: sizes.iconHero },
  topTier:     { alignSelf: "flex-start", marginBottom: spacing.xs },
  topName:     { ...type.bodyStrong, color: colors.text },
  topSub:      { ...type.micro, color: colors.textSecondary },
  movers:      { paddingVertical: spacing.sm, paddingLeft: spacing.md },
  moversSep:   { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: sizes.hairline, borderTopColor: colors.border },
  moversLabel: { ...type.captionStrong, marginBottom: spacing.xs },
  patch:       { height: sizes.chart, borderRadius: radii.xl, overflow: "hidden", justifyContent: "flex-end", backgroundColor: colors.surfaceRaised },
  patchBody:   { padding: spacing.md },
  patchTitle:  { ...type.bodyStrong, color: colors.text },
  patchSub:    { ...type.micro, color: ACCENT, marginTop: spacing.xxs },
  note:        { ...type.caption, color: colors.textMuted },
  source:      { ...type.micro, color: colors.textMuted, marginTop: spacing.sm },
});
