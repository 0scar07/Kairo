import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, Image,
  TouchableOpacity, Alert, TextInput, Modal, Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LineChart } from "react-native-chart-kit";
import RankedCard from "../components/RankedCard";
import ChampionStatsRow from "../components/ChampionStatsRow";
import { Card, SectionLabel, SegmentedTabs, ProfileHeader } from "../components/ui";
import { searchPlayer } from "../api/riot";
import { championIcon, profileIconUrl } from "../api/ddragon";
import { MY_PROFILE_KEY, TIER_ICONS } from "../constants/config";
import { errorMessage, findMe, getChampionStats, queueLabel, winrate } from "../utils/lol";
import {
  colors, accents, radii, sizes, spacing, fontSizes, lineHeights, type, kdaColor, winrateColor, useAccent, withAlpha, glow,
} from "../theme";

const GAME = "lol";
const CHART_WIDTH = Dimensions.get("window").width - spacing.xl - spacing.xxl - spacing.lg;

const TABS = [
  { key: "campeones", label: "🏆 CAMPEONES" },
  { key: "historial", label: "🎮 HISTORIAL" },
];

function getBadges(me, champStats) {
  const badges = [];
  if (!me.length) return badges;
  const avgKda     = me.reduce((a, p) => a + (p.deaths === 0 ? 5 : (p.kills + p.assists) / p.deaths), 0) / me.length;
  const avgDmg     = me.reduce((a, p) => a + p.totalDamageDealtToChampions, 0) / me.length;
  const wr         = (me.filter(p => p.win).length / me.length) * 100;
  const pentakills = me.reduce((a, p) => a + (p.pentaKills || 0), 0);
  const topChamp   = champStats[0];
  if (avgKda >= 4)        badges.push({ icon: "⚡", label: "KDA Machine",    color: colors.gold });
  if (avgDmg >= 25000)    badges.push({ icon: "💥", label: "Damage Dealer",  color: colors.loss });
  if (wr >= 60)           badges.push({ icon: "🏆", label: "Win Streak God", color: colors.win });
  if (pentakills > 0)     badges.push({ icon: "👑", label: "Pentakill",      color: accents.lol });
  if (topChamp?.wr >= 65) badges.push({ icon: "🎯", label: "One Trick",      color: accents.tft });
  if (me.length >= 20)    badges.push({ icon: "🔥", label: "Grinder",        color: colors.orange });
  return badges;
}

function Badge({ badge }) {
  return (
    <View style={[styles.badge, { borderColor: badge.color }]}>
      <Text style={styles.badgeIcon}>{badge.icon}</Text>
      <Text style={[styles.badgeLabel, { color: badge.color }]}>{badge.label}</Text>
    </View>
  );
}

function SetupModal({ visible, onSave }) {
  const accent = useAccent(GAME);
  const [name, setName] = useState("");
  const [tag,  setTag]  = useState("");

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>⚔️ Mi Perfil</Text>
          <Text style={styles.modalSubtitle}>
            Ingresa tu Riot ID para configurar tu perfil personal
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nombre (ej: Faker)"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            value={tag}
            onChangeText={setTag}
            placeholder="TAG (ej: KR1)"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.modalBtn, { backgroundColor: accent }, glow(accent, spacing.md, 0.4)]}
            onPress={() => {
              if (!name || !tag) {
                Alert.alert("Error", "Ingresa tu nombre y TAG");
                return;
              }
              onSave(name, tag);
            }}
          >
            <Text style={styles.modalBtnText}>Guardar perfil</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => onSave(null, null)}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function MyProfileScreen() {
  const accent = useAccent(GAME);
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSetup,  setShowSetup]  = useState(false);
  const [activeTab,  setActiveTab]  = useState("campeones");

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    try {
      const raw = await AsyncStorage.getItem(MY_PROFILE_KEY);
      if (raw) {
        const { gameName, tagLine } = JSON.parse(raw);
        await fetchProfile(gameName, tagLine);
      } else {
        setShowSetup(true);
        setLoading(false);
      }
    } catch (e) {
      console.warn("No se pudo leer Mi Perfil:", e.message);
      setShowSetup(true);
      setLoading(false);
    }
  }

  async function fetchProfile(gameName, tagLine) {
    setLoading(true);
    try {
      const fresh = await searchPlayer(gameName, tagLine);
      setData(fresh);
      await AsyncStorage.setItem(MY_PROFILE_KEY, JSON.stringify({ gameName, tagLine }));
    } catch (e) {
      Alert.alert("Error", "No se pudo cargar el perfil: " + errorMessage(e));
      setShowSetup(true);
    }
    setLoading(false);
  }

  async function onRefresh() {
    if (!data) return;
    setRefreshing(true);
    try {
      const raw = await AsyncStorage.getItem(MY_PROFILE_KEY);
      const { gameName, tagLine } = JSON.parse(raw);
      const fresh = await searchPlayer(gameName, tagLine);
      setData(fresh);
    } catch (e) {
      Alert.alert("Error", "No se pudo actualizar: " + errorMessage(e));
    }
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={[styles.loadingText, { color: accent }]}>⚔️ Cargando perfil...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <SetupModal visible={showSetup} onSave={(n, t) => {
          setShowSetup(false);
          if (n && t) fetchProfile(n, t);
        }} />
      </View>
    );
  }

  const { account, summoner, ranked, matches } = data;
  const soloQ      = ranked?.find(r => r.queueType === "RANKED_SOLO_5x5");
  const flex       = ranked?.find(r => r.queueType === "RANKED_FLEX_SR");
  const champStats = getChampionStats(matches || [], account.puuid);

  const me         = (matches || []).map(m => findMe(m, account.puuid)).filter(Boolean);
  const badges     = getBadges(me, champStats);
  const wins       = me.filter(p => p.win).length;
  const wr         = winrate(wins, me.length - wins);
  const avg        = key => (me.length ? (me.reduce((a, p) => a + p[key], 0) / me.length).toFixed(1) : 0);
  const avgDmg     = me.length ? Math.round(me.reduce((a, p) => a + p.totalDamageDealtToChampions, 0) / me.length / 1000) : 0;
  const bestKda    = me.reduce((best, p) => {
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
    { label: "Winrate",    value: `${wr}%`,                                     color: winrateColor(wr, accent) },
    { label: "KDA Prom.",  value: `${avg("kills")}/${avg("deaths")}/${avg("assists")}`, color: colors.text },
    { label: "Mejor KDA",  value: bestKda,                                      color: colors.gold },
    { label: "Daño Prom.", value: `${avgDmg}k`,                                 color: colors.loss },
    { label: "Victorias",  value: wins,                                         color: colors.win },
    { label: "Partidas",   value: me.length,                                    color: colors.text },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
    >
      <SetupModal visible={showSetup} onSave={(n, t) => {
        setShowSetup(false);
        if (n && t) fetchProfile(n, t);
      }} />

      <ProfileHeader
        game={GAME}
        avatar={
          <Image
            source={{ uri: profileIconUrl(summoner.profileIconId) }}
            style={[styles.profileImg, { borderColor: accent }, glow(accent, spacing.md, 0.35)]}
          />
        }
        name={account.gameName}
        tag={account.tagLine}
        subtitle={`Nivel ${summoner.summonerLevel}`}
        badge={soloQ ? `${TIER_ICONS[soloQ.tier] || ""} ${soloQ.tier} ${soloQ.rank} · ${soloQ.leaguePoints} LP` : null}
        action="✏️"
        onAction={() => setShowSetup(true)}
      />

      {badges.length > 0 && (
        <Card>
          <SectionLabel>🏅 Insignias</SectionLabel>
          <View style={styles.badgesRow}>
            {badges.map(b => <Badge key={b.label} badge={b} />)}
          </View>
        </Card>
      )}

      {(soloQ || flex) && (
        <View style={styles.rankedRow}>
          {soloQ && <RankedCard entry={soloQ} label="Solo / Dúo" game={GAME} />}
          {flex  && <RankedCard entry={flex}  label="Flex 5v5"   game={GAME} />}
        </View>
      )}

      <Card>
        <SectionLabel>📊 Estadísticas generales</SectionLabel>
        <View style={styles.statsGrid}>
          {statBoxes.map(s => (
            <View key={s.label} style={styles.statBox}>
              <Text style={[styles.statNum, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label.toUpperCase()}</Text>
            </View>
          ))}
        </View>
      </Card>

      {me.length >= 3 && (
        <Card>
          <SectionLabel>📈 KDA últimas {Math.min(me.length, 10)} partidas</SectionLabel>
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
      )}

      <SegmentedTabs tabs={TABS} value={activeTab} onChange={setActiveTab} game={GAME} />

      {activeTab === "campeones" && (
        <Card>
          {champStats.slice(0, 7).map((c, i) => (
            <ChampionStatsRow
              key={c.name}
              champ={c}
              rank={i}
              game={GAME}
              detail={`${c.games} partidas · ${Math.round(c.avgDmg / 1000)}k dmg prom`}
            />
          ))}
        </Card>
      )}

      {activeTab === "historial" && (
        <View>
          {(matches || []).map(m => {
            const p = findMe(m, account.puuid);
            if (!p) return null;
            const resultColor = p.win ? colors.win : colors.loss;
            return (
              <View key={m.metadata.matchId} style={[styles.histRow, {
                borderLeftColor: resultColor,
                backgroundColor: p.win ? colors.winBg : colors.lossBg,
              }]}>
                <Image source={{ uri: championIcon(p.championName) }} style={styles.histChamp} />
                <View style={styles.histInfo}>
                  <Text style={[styles.histResult, { color: resultColor }]}>
                    {p.win ? "VICTORIA" : "DERROTA"}
                  </Text>
                  <Text style={styles.histChampName}>{p.championName} · {queueLabel(m.info.queueId)}</Text>
                </View>
                <Text style={styles.histKda}>{p.kills}/{p.deaths}/{p.assists}</Text>
                <Text style={[styles.histDmg, { color: accent }]}>{Math.round(p.totalDamageDealtToChampions / 1000)}k dmg</Text>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.bg },
  content:       { padding: spacing.lg, paddingBottom: spacing.xxxl },
  center:        { flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" },
  loadingText:   { ...type.heading },
  profileImg:    {
    width: sizes.avatarHero, height: sizes.avatarHero, borderRadius: sizes.avatarHero / 2,
    borderWidth: sizes.borderAccent, backgroundColor: colors.surfaceHigh,
  },
  badgesRow:     { flexDirection: "row", flexWrap: "wrap" },
  badge:         {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radii.pill, borderWidth: sizes.hairline,
    backgroundColor: colors.bg, marginRight: spacing.sm, marginBottom: spacing.sm,
  },
  badgeIcon:     { fontSize: fontSizes.base },
  badgeLabel:    { ...type.smallStrong },
  rankedRow:     { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  statsGrid:     { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  statBox:       {
    flex: 1, minWidth: "28%", alignItems: "center",
    backgroundColor: colors.bg, borderRadius: radii.md, padding: spacing.md,
    borderWidth: sizes.hairline, borderColor: colors.border,
  },
  statNum:       { ...type.heading, letterSpacing: 0 },
  statLabel:     { ...type.label, color: colors.textMuted, marginTop: spacing.xs },
  histRow:       {
    flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md,
    borderLeftWidth: sizes.borderAccent, borderRadius: radii.md, marginBottom: spacing.xs,
  },
  histChamp:     { width: sizes.avatarLg, height: sizes.avatarLg, borderRadius: radii.sm, backgroundColor: colors.surfaceHigh },
  histInfo:      { flex: 1 },
  histResult:    { ...type.label },
  histChampName: { ...type.bodyStrong, color: colors.text, marginTop: spacing.xxs },
  histKda:       { ...type.bodyStrong, color: colors.text },
  histDmg:       { ...type.caption, minWidth: spacing.xxxl + spacing.sm, textAlign: "right" },
  overlay:       { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", alignItems: "center", padding: spacing.xl },
  modal:         {
    backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.xl,
    width: "100%", borderWidth: sizes.hairline, borderColor: colors.border,
  },
  modalTitle:    { ...type.title, fontSize: fontSizes.xxl, color: colors.text, marginBottom: spacing.sm },
  modalSubtitle: { ...type.body, color: colors.textMuted, marginBottom: spacing.xl, lineHeight: lineHeights.body },
  input:         {
    ...type.body, backgroundColor: colors.bg, borderWidth: sizes.hairline, borderColor: colors.border,
    borderRadius: radii.md, padding: spacing.lg, color: colors.text, marginBottom: spacing.md,
  },
  modalBtn:      { borderRadius: radii.md, padding: spacing.lg, alignItems: "center", marginTop: spacing.xs },
  modalBtnText:  { ...type.heading, color: colors.onAccent },
  cancelBtn:     { marginTop: spacing.md, padding: spacing.lg, alignItems: "center" },
  cancelText:    { ...type.body, color: colors.textMuted },
});
