import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, Image, TouchableOpacity, Alert,
  TextInput, Modal, Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LineChart } from "react-native-chart-kit";
import { searchPlayer } from "../api/riot";
import { DD, TIER_COLORS, TIER_ICONS } from "../constants/config";

const MY_PROFILE_KEY = "ggtracker_my_profile";
const SCREEN_WIDTH   = Dimensions.get("window").width - 32;

function getChampionStats(matches, puuid) {
  const stats = {};
  matches.forEach(m => {
    const me = m.info?.participants?.find(p => p.puuid === puuid);
    if (!me) return;
    const c = me.championName;
    if (!stats[c]) stats[c] = { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, damage: 0 };
    stats[c].games++;
    if (me.win) stats[c].wins++;
    stats[c].kills   += me.kills;
    stats[c].deaths  += me.deaths;
    stats[c].assists += me.assists;
    stats[c].damage  += me.totalDamageDealtToChampions;
  });
  return Object.entries(stats)
    .map(([name, s]) => ({
      name,
      games:   s.games,
      wr:      Math.round((s.wins / s.games) * 100),
      kda:     s.deaths === 0 ? "Perfect" : ((s.kills + s.assists) / s.deaths).toFixed(2),
      kills:   (s.kills   / s.games).toFixed(1),
      deaths:  (s.deaths  / s.games).toFixed(1),
      assists: (s.assists / s.games).toFixed(1),
      avgDmg:  Math.round(s.damage / s.games),
    }))
    .sort((a, b) => b.games - a.games);
}

function getBadges(matches, puuid, champStats) {
  const badges = [];
  const me = matches.map(m => m.info?.participants?.find(p => p.puuid === puuid)).filter(Boolean);
  if (!me.length) return badges;
  const avgKda     = me.reduce((a, p) => a + (p.deaths === 0 ? 5 : (p.kills + p.assists) / p.deaths), 0) / me.length;
  const avgDmg     = me.reduce((a, p) => a + p.totalDamageDealtToChampions, 0) / me.length;
  const wins       = me.filter(p => p.win).length;
  const wr         = (wins / me.length) * 100;
  const pentakills = me.reduce((a, p) => a + (p.pentaKills || 0), 0);
  const topChamp   = champStats[0];
  if (avgKda >= 4)        badges.push({ icon: "⚡", label: "KDA Machine",   color: "#f1c40f" });
  if (avgDmg >= 25000)    badges.push({ icon: "💥", label: "Damage Dealer",  color: "#e05555" });
  if (wr >= 60)           badges.push({ icon: "🏆", label: "Win Streak God", color: "#4fc97a" });
  if (pentakills > 0)     badges.push({ icon: "👑", label: "Pentakill",       color: "#c89b3c" });
  if (topChamp?.wr >= 65) badges.push({ icon: "🎯", label: "One Trick",       color: "#0bc4e3" });
  if (me.length >= 20)    badges.push({ icon: "🔥", label: "Grinder",         color: "#ff6b35" });
  return badges;
}

function Badge({ badge }) {
  return (
    <View style={[badgeStyles.container, { borderColor: badge.color }]}>
      <Text style={badgeStyles.icon}>{badge.icon}</Text>
      <Text style={[badgeStyles.label, { color: badge.color }]}>{badge.label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  container: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
    backgroundColor: "#0a0e17", marginRight: 8, marginBottom: 8,
  },
  icon:  { fontSize: 14 },
  label: { fontSize: 11, fontWeight: "700" },
});

function ChampRow({ champ, rank }) {
  const rankColors = ["#FFD700", "#C0C0C0", "#cd7f32"];
  return (
    <View style={champStyles.row}>
      <Text style={[champStyles.rank, { color: rankColors[rank] || "#445566" }]}>#{rank + 1}</Text>
      <Image
        source={{ uri: `${DD}/img/champion/${champ.name.replace(/\s/g, "")}.png` }}
        style={champStyles.img}
      />
      <View style={{ flex: 1 }}>
        <Text style={champStyles.name}>{champ.name}</Text>
        <Text style={champStyles.games}>{champ.games} partidas · {Math.round(champ.avgDmg / 1000)}k dmg prom</Text>
      </View>
      <View style={champStyles.kdaBlock}>
        <Text style={champStyles.kdaText}>{champ.kills}/{champ.deaths}/{champ.assists}</Text>
        <Text style={[champStyles.kdaRatio, {
          color: champ.kda === "Perfect" ? "#f1c40f" : parseFloat(champ.kda) >= 3 ? "#4fc97a" : "#8899aa",
        }]}>{champ.kda} KDA</Text>
      </View>
      <View style={champStyles.wrBlock}>
        <Text style={[champStyles.wr, {
          color: champ.wr >= 55 ? "#4fc97a" : champ.wr >= 50 ? "#c89b3c" : "#e05555",
        }]}>{champ.wr}%</Text>
        <View style={champStyles.barBg}>
          <View style={[champStyles.barFill, {
            width: `${champ.wr}%`,
            backgroundColor: champ.wr >= 55 ? "#4fc97a" : champ.wr >= 50 ? "#c89b3c" : "#e05555",
          }]} />
        </View>
      </View>
    </View>
  );
}

const champStyles = StyleSheet.create({
  row:      { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#1e2a3a" },
  rank:     { fontWeight: "900", fontSize: 14, minWidth: 24 },
  img:      { width: 40, height: 40, borderRadius: 8 },
  name:     { color: "#dce8f5", fontWeight: "700", fontSize: 13 },
  games:    { color: "#556677", fontSize: 11, marginTop: 2 },
  kdaBlock: { alignItems: "flex-end" },
  kdaText:  { color: "#dce8f5", fontSize: 12, fontWeight: "600" },
  kdaRatio: { fontSize: 11 },
  wrBlock:  { alignItems: "flex-end", minWidth: 45 },
  wr:       { fontWeight: "800", fontSize: 14 },
  barBg:    { width: 40, height: 3, backgroundColor: "#1e2a3a", borderRadius: 2, marginTop: 3 },
  barFill:  { height: "100%", borderRadius: 2 },
});

function SetupModal({ visible, onSave }) {
  const [name, setName] = useState("");
  const [tag,  setTag]  = useState("");

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <Text style={modalStyles.title}>⚔️ Mi Perfil</Text>
          <Text style={modalStyles.subtitle}>
            Ingresa tu Riot ID para configurar tu perfil personal
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nombre (ej: Faker)"
            placeholderTextColor="#334455"
            style={modalStyles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            value={tag}
            onChangeText={setTag}
            placeholder="TAG (ej: KR1)"
            placeholderTextColor="#334455"
            style={modalStyles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={modalStyles.btn}
            onPress={() => {
              if (!name || !tag) {
                Alert.alert("Error", "Ingresa tu nombre y TAG");
                return;
              }
              onSave(name, tag);
            }}
          >
            <Text style={modalStyles.btnText}>Guardar perfil</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={modalStyles.cancelBtn}
            onPress={() => onSave(null, null)}
          >
            <Text style={modalStyles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: "#000000aa", justifyContent: "center", alignItems: "center", padding: 24 },
  container:  { backgroundColor: "#0f1923", borderRadius: 16, padding: 24, width: "100%", borderWidth: 1, borderColor: "#1e2a3a" },
  title:      { color: "#dce8f5", fontWeight: "900", fontSize: 22, marginBottom: 8 },
  subtitle:   { color: "#556677", fontSize: 13, marginBottom: 20, lineHeight: 20 },
  input:      { backgroundColor: "#0a0e17", borderWidth: 1, borderColor: "#1e2a3a", borderRadius: 10, padding: 14, color: "#dce8f5", fontSize: 14, marginBottom: 12 },
  btn:        { backgroundColor: "#c89b3c", borderRadius: 10, padding: 14, alignItems: "center", marginTop: 4 },
  btnText:    { color: "#0a0e17", fontWeight: "800", fontSize: 15 },
  cancelBtn:  { marginTop: 10, padding: 14, alignItems: "center" },
  cancelText: { color: "#445566", fontSize: 14 },
});

export default function MyProfileScreen() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSetup,  setShowSetup]  = useState(false);
  const [activeTab,  setActiveTab]  = useState("stats");

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
    } catch (_) {
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
      Alert.alert("Error", "No se pudo cargar el perfil");
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
    } catch (_) {}
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>⚔️ Cargando perfil...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.loadingContainer}>
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
  const badges     = getBadges(matches || [], account.puuid, champStats);

  const me         = (matches || []).map(m => m.info?.participants?.find(p => p.puuid === account.puuid)).filter(Boolean);
  const wins       = me.filter(p => p.win).length;
  const wr         = me.length ? Math.round((wins / me.length) * 100) : 0;
  const avgKills   = me.length ? (me.reduce((a, p) => a + p.kills,   0) / me.length).toFixed(1) : 0;
  const avgDeaths  = me.length ? (me.reduce((a, p) => a + p.deaths,  0) / me.length).toFixed(1) : 0;
  const avgAssists = me.length ? (me.reduce((a, p) => a + p.assists, 0) / me.length).toFixed(1) : 0;
  const avgDmg     = me.length ? Math.round(me.reduce((a, p) => a + p.totalDamageDealtToChampions, 0) / me.length / 1000) : 0;
  const bestKda    = me.reduce((best, p) => {
    const kda = p.deaths === 0 ? 99 : (p.kills + p.assists) / p.deaths;
    return kda > best ? kda : best;
  }, 0).toFixed(1);

  const chartData = {
    labels: me.slice(-10).map(() => ""),
    datasets: [{
      data: me.slice(-10).map(p => p.deaths === 0 ? 5 : parseFloat(((p.kills + p.assists) / p.deaths).toFixed(1))),
      color: (opacity = 1) => `rgba(200, 155, 60, ${opacity})`,
      strokeWidth: 2,
    }],
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c89b3c" />
      }
    >
      <SetupModal visible={showSetup} onSave={(n, t) => {
        setShowSetup(false);
        if (n && t) fetchProfile(n, t);
      }} />

      {/* Header */}
      <View style={styles.profileHeader}>
        <Image
          source={{ uri: `${DD}/img/profileicon/${summoner.profileIconId}.png` }}
          style={styles.profileImg}
        />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.gameName}>{account.gameName}</Text>
          <Text style={styles.tagLine}>#{account.tagLine}</Text>
          <Text style={styles.level}>Nivel {summoner.summonerLevel}</Text>
          {soloQ && (
            <View style={[styles.tierBadge, { borderColor: TIER_COLORS[soloQ.tier] }]}>
              <Text style={[styles.tierText, { color: TIER_COLORS[soloQ.tier] }]}>
                {TIER_ICONS[soloQ.tier]} {soloQ.tier} {soloQ.rank} · {soloQ.leaguePoints} LP
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => setShowSetup(true)} style={styles.editBtn}>
          <Text style={styles.editText}>✏️</Text>
        </TouchableOpacity>
      </View>

      {/* Insignias */}
      {badges.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>🏅 INSIGNIAS</Text>
          <View style={styles.badgesRow}>
            {badges.map((b, i) => <Badge key={i} badge={b} />)}
          </View>
        </View>
      )}

      {/* Ranked */}
      {(soloQ || flex) && (
        <View style={styles.rankedRow}>
          {soloQ && (
            <View style={[styles.rankedCard, { borderLeftColor: TIER_COLORS[soloQ.tier] || "#888" }]}>
              <Text style={styles.sectionLabel}>SOLO / DUO</Text>
              <Text style={{ fontSize: 28 }}>{TIER_ICONS[soloQ.tier]}</Text>
              <Text style={[styles.tierBig, { color: TIER_COLORS[soloQ.tier] }]}>{soloQ.tier} {soloQ.rank}</Text>
              <Text style={styles.lpText}>{soloQ.leaguePoints} LP</Text>
              <Text style={styles.recordText}>{soloQ.wins}V / {soloQ.losses}D</Text>
              <View style={styles.barBg}>
                <View style={[styles.barFill, {
                  width: `${Math.round((soloQ.wins / (soloQ.wins + soloQ.losses)) * 100)}%`,
                  backgroundColor: TIER_COLORS[soloQ.tier],
                }]} />
              </View>
            </View>
          )}
          {flex && (
            <View style={[styles.rankedCard, { borderLeftColor: TIER_COLORS[flex.tier] || "#888" }]}>
              <Text style={styles.sectionLabel}>FLEX 5v5</Text>
              <Text style={{ fontSize: 28 }}>{TIER_ICONS[flex.tier]}</Text>
              <Text style={[styles.tierBig, { color: TIER_COLORS[flex.tier] }]}>{flex.tier} {flex.rank}</Text>
              <Text style={styles.lpText}>{flex.leaguePoints} LP</Text>
              <Text style={styles.recordText}>{flex.wins}V / {flex.losses}D</Text>
              <View style={styles.barBg}>
                <View style={[styles.barFill, {
                  width: `${Math.round((flex.wins / (flex.wins + flex.losses)) * 100)}%`,
                  backgroundColor: TIER_COLORS[flex.tier],
                }]} />
              </View>
            </View>
          )}
        </View>
      )}

      {/* Stats generales */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>📊 ESTADÍSTICAS GENERALES</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: wr >= 55 ? "#4fc97a" : wr >= 50 ? "#c89b3c" : "#e05555" }]}>{wr}%</Text>
            <Text style={styles.statLabel}>Winrate</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{avgKills}/{avgDeaths}/{avgAssists}</Text>
            <Text style={styles.statLabel}>KDA Prom.</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: "#f1c40f" }]}>{bestKda}</Text>
            <Text style={styles.statLabel}>Mejor KDA</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: "#e05555" }]}>{avgDmg}k</Text>
            <Text style={styles.statLabel}>Daño Prom.</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: "#4fc97a" }]}>{wins}</Text>
            <Text style={styles.statLabel}>Victorias</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{me.length}</Text>
            <Text style={styles.statLabel}>Partidas</Text>
          </View>
        </View>
      </View>

      {/* Gráfica KDA */}
      {me.length >= 3 && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>📈 KDA ÚLTIMAS {Math.min(me.length, 10)} PARTIDAS</Text>
          <LineChart
            data={chartData}
            width={SCREEN_WIDTH - 28}
            height={120}
            chartConfig={{
              backgroundColor: "#0f1923",
              backgroundGradientFrom: "#0f1923",
              backgroundGradientTo: "#0f1923",
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(200, 155, 60, ${opacity})`,
              labelColor: () => "#445566",
              propsForDots: { r: "4" },
            }}
            bezier
            style={{ borderRadius: 8 }}
            withHorizontalLabels={true}
            withVerticalLabels={false}
            withDots={true}
            withInnerLines={false}
            withOuterLines={false}
          />
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        {["campeones", "historial"].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === "campeones" ? "🏆 CAMPEONES" : "🎮 HISTORIAL"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Campeones */}
      {activeTab === "campeones" && (
        <View style={styles.card}>
          {champStats.slice(0, 7).map((c, i) => (
            <ChampRow key={c.name} champ={c} rank={i} />
          ))}
        </View>
      )}

      {/* Tab Historial */}
      {activeTab === "historial" && (
        <View>
          {(matches || []).map(m => {
            const p = m.info?.participants?.find(x => x.puuid === account.puuid);
            if (!p) return null;
            return (
              <View key={m.metadata.matchId} style={[styles.histRow, {
                borderLeftColor: p.win ? "#4fc97a" : "#e05555",
                backgroundColor: p.win ? "#0a1f14" : "#1f0a0a",
              }]}>
                <Image
                  source={{ uri: `${DD}/img/champion/${p.championName?.replace(/\s/g, "")}.png` }}
                  style={styles.histChamp}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.histResult, { color: p.win ? "#4fc97a" : "#e05555" }]}>
                    {p.win ? "VICTORIA" : "DERROTA"}
                  </Text>
                  <Text style={styles.histChampName}>{p.championName}</Text>
                </View>
                <Text style={styles.histKda}>{p.kills}/{p.deaths}/{p.assists}</Text>
                <Text style={styles.histDmg}>{Math.round(p.totalDamageDealtToChampions / 1000)}k dmg</Text>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: "#070b12" },
  loadingContainer: { flex: 1, backgroundColor: "#070b12", justifyContent: "center", alignItems: "center" },
  loadingText:      { color: "#c89b3c", fontSize: 16, fontWeight: "700" },
  profileHeader:    { flexDirection: "row", alignItems: "center", backgroundColor: "#0f1923", borderWidth: 1, borderColor: "#1e2a3a", borderRadius: 12, padding: 16, marginBottom: 14 },
  profileImg:       { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: "#c89b3c" },
  gameName:         { color: "#dce8f5", fontWeight: "900", fontSize: 20 },
  tagLine:          { color: "#556677", fontSize: 13 },
  level:            { color: "#445566", fontSize: 11, marginTop: 2 },
  tierBadge:        { marginTop: 6, alignSelf: "flex-start", backgroundColor: "#0a0e17", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  tierText:         { fontWeight: "700", fontSize: 12 },
  editBtn:          { padding: 8 },
  editText:         { fontSize: 20 },
  card:             { backgroundColor: "#0f1923", borderWidth: 1, borderColor: "#1e2a3a", borderRadius: 12, padding: 14, marginBottom: 14 },
  sectionLabel:     { fontSize: 10, color: "#445566", letterSpacing: 1, marginBottom: 10 },
  badgesRow:        { flexDirection: "row", flexWrap: "wrap" },
  rankedRow:        { flexDirection: "row", gap: 10, marginBottom: 14 },
  rankedCard:       { flex: 1, backgroundColor: "#0f1923", borderWidth: 1, borderColor: "#1e2a3a", borderLeftWidth: 3, borderRadius: 12, padding: 14 },
  tierBig:          { fontWeight: "900", fontSize: 16, letterSpacing: 1, marginTop: 4 },
  lpText:           { color: "#c89b3c", fontWeight: "700", fontSize: 13 },
  recordText:       { color: "#8899aa", fontSize: 11, marginTop: 4 },
  barBg:            { height: 4, backgroundColor: "#1e2a3a", borderRadius: 2, marginTop: 8 },
  barFill:          { height: "100%", borderRadius: 2 },
  statsGrid:        { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statBox:          { flex: 1, minWidth: "28%", alignItems: "center", backgroundColor: "#0a0e17", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#1e2a3a" },
  statNum:          { color: "#dce8f5", fontWeight: "900", fontSize: 16 },
  statLabel:        { color: "#445566", fontSize: 10, letterSpacing: 1, marginTop: 4 },
  tabs:             { flexDirection: "row", marginBottom: 14, backgroundColor: "#0f1923", borderRadius: 8, padding: 4 },
  tab:              { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 6 },
  tabActive:        { backgroundColor: "#1e2a3a" },
  tabText:          { color: "#445566", fontWeight: "700", fontSize: 12, letterSpacing: 1 },
  tabTextActive:    { color: "#c89b3c" },
  histRow:          { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderLeftWidth: 3, borderRadius: 8, marginBottom: 4 },
  histChamp:        { width: 40, height: 40, borderRadius: 6 },
  histResult:       { fontWeight: "800", fontSize: 11, letterSpacing: 1 },
  histChampName:    { color: "#dce8f5", fontSize: 13, fontWeight: "700", marginTop: 2 },
  histKda:          { color: "#dce8f5", fontWeight: "700", fontSize: 13 },
  histDmg:          { color: "#c89b3c", fontSize: 11, minWidth: 55, textAlign: "right" },
});