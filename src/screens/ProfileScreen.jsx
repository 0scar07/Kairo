import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ProfileIcon from "../components/ProfileIcon";
import RankedCard  from "../components/RankedCard";
import MatchRow    from "../components/MatchRow";
import MatchDetail from "../components/MatchDetail";
import { searchPlayer, getMoreMatches, MATCH_PAGE } from "../api/riot";
import { championIcon } from "../api/ddragon";
import { FAVORITES_KEY } from "../constants/config";
import { errorMessage } from "../utils/lol";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getChampionStats(matches, puuid) {
  const stats = {};
  matches.forEach(m => {
    const me = m.info?.participants?.find(p => p.puuid === puuid);
    if (!me) return;
    const c = me.championName;
    if (!stats[c]) stats[c] = { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 };
    stats[c].games++;
    if (me.win) stats[c].wins++;
    stats[c].kills   += me.kills;
    stats[c].deaths  += me.deaths;
    stats[c].assists += me.assists;
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
    }))
    .sort((a, b) => b.games - a.games)
    .slice(0, 5);
}

function getOverallStats(matches, puuid) {
  if (!matches?.length) return null;
  let wins = 0, kills = 0, deaths = 0, assists = 0, games = 0;
  matches.forEach(m => {
    const me = m.info?.participants?.find(p => p.puuid === puuid);
    if (!me) return;
    games++;
    if (me.win) wins++;
    kills   += me.kills;
    deaths  += me.deaths;
    assists += me.assists;
  });
  if (!games) return null;
  return {
    games, wr: Math.round((wins / games) * 100),
    wins, losses: games - wins,
    kda:        deaths === 0 ? "Perfect" : ((kills + assists) / deaths).toFixed(2),
    avgKills:   (kills   / games).toFixed(1),
    avgDeaths:  (deaths  / games).toFixed(1),
    avgAssists: (assists / games).toFixed(1),
  };
}

function getStreak(matches, puuid) {
  if (!matches?.length) return null;
  const first = matches[0].info?.participants?.find(p => p.puuid === puuid);
  if (!first) return null;
  const isWin = first.win;
  let count = 0;
  for (const m of matches) {
    const me = m.info?.participants?.find(p => p.puuid === puuid);
    if (!me || me.win !== isWin) break;
    count++;
  }
  if (count < 2) return null;
  return { isWin, count };
}

// ─── RESUMEN GENERAL ─────────────────────────────────────────────────────────
function OverallStats({ stats, topChamp }) {
  if (!stats) return null;
  return (
    <View style={overallStyles.card}>
      <Text style={overallStyles.label}>RESUMEN — ÚLTIMAS {stats.games} PARTIDAS</Text>
      <View style={overallStyles.row}>
        <View style={overallStyles.block}>
          <Text style={[overallStyles.bigNum, {
            color: stats.wr >= 55 ? "#4fc97a" : stats.wr >= 50 ? "#c89b3c" : "#e05555"
          }]}>{stats.wr}%</Text>
          <Text style={overallStyles.sub}>{stats.wins}V {stats.losses}D</Text>
          <Text style={overallStyles.title}>Winrate</Text>
        </View>
        <View style={overallStyles.divider} />
        <View style={overallStyles.block}>
          <Text style={[overallStyles.bigNum, {
            color: stats.kda === "Perfect" ? "#f1c40f"
                 : parseFloat(stats.kda) >= 3 ? "#4fc97a" : "#dce8f5"
          }]}>{stats.kda}</Text>
          <Text style={overallStyles.sub}>{stats.avgKills}/{stats.avgDeaths}/{stats.avgAssists}</Text>
          <Text style={overallStyles.title}>KDA Prom.</Text>
        </View>
        {topChamp && (
          <>
            <View style={overallStyles.divider} />
            <View style={overallStyles.block}>
              <Image
                source={{ uri: championIcon(topChamp.name) }}
                style={overallStyles.champImg}
              />
              <Text style={overallStyles.sub}>{topChamp.games} partidas</Text>
              <Text style={overallStyles.title}>Más jugado</Text>
            </View>
          </>
        )}
      </View>
      <View style={overallStyles.barBg}>
        <View style={[overallStyles.barFill, {
          width: `${stats.wr}%`,
          backgroundColor: stats.wr >= 55 ? "#4fc97a" : stats.wr >= 50 ? "#c89b3c" : "#e05555",
        }]} />
      </View>
    </View>
  );
}

const overallStyles = StyleSheet.create({
  card:     {
    backgroundColor: "#0f1923", borderWidth: 1,
    borderColor: "#1e2a3a", borderRadius: 12, padding: 14, marginBottom: 14,
  },
  label:    { color: "#445566", fontSize: 10, letterSpacing: 1, marginBottom: 12 },
  row:      { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  block:    { alignItems: "center", gap: 3 },
  bigNum:   { fontSize: 22, fontWeight: "900" },
  sub:      { color: "#8899aa", fontSize: 11 },
  title:    { color: "#445566", fontSize: 10, letterSpacing: 1 },
  champImg: { width: 40, height: 40, borderRadius: 8 },
  divider:  { width: 1, height: 50, backgroundColor: "#1e2a3a" },
  barBg:    { height: 4, backgroundColor: "#1e2a3a", borderRadius: 2, marginTop: 12 },
  barFill:  { height: "100%", borderRadius: 2 },
});

// ─── CAMPEONES ────────────────────────────────────────────────────────────────
function ChampionStatsRow({ champ }) {
  return (
    <View style={champStyles.row}>
      <Image
        source={{ uri: championIcon(champ.name) }}
        style={champStyles.img}
      />
      <View style={{ flex: 1 }}>
        <Text style={champStyles.name}>{champ.name}</Text>
        <Text style={champStyles.games}>{champ.games} partidas</Text>
      </View>
      <View style={champStyles.kdaBlock}>
        <Text style={champStyles.kdaText}>{champ.kills}/{champ.deaths}/{champ.assists}</Text>
        <Text style={[champStyles.kdaRatio, {
          color: champ.kda === "Perfect" ? "#f1c40f"
               : parseFloat(champ.kda) >= 3 ? "#4fc97a" : "#8899aa"
        }]}>{champ.kda} KDA</Text>
      </View>
      <View style={champStyles.wrBlock}>
        <Text style={[champStyles.wr, {
          color: champ.wr >= 55 ? "#4fc97a" : champ.wr >= 50 ? "#c89b3c" : "#e05555"
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
  row:      {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#1e2a3a",
  },
  img:      { width: 36, height: 36, borderRadius: 6 },
  name:     { color: "#dce8f5", fontWeight: "700", fontSize: 13 },
  games:    { color: "#556677", fontSize: 11 },
  kdaBlock: { alignItems: "flex-end" },
  kdaText:  { color: "#dce8f5", fontSize: 12, fontWeight: "600" },
  kdaRatio: { fontSize: 11 },
  wrBlock:  { alignItems: "flex-end", minWidth: 45 },
  wr:       { fontWeight: "800", fontSize: 14 },
  barBg:    { width: 40, height: 3, backgroundColor: "#1e2a3a", borderRadius: 2, marginTop: 3 },
  barFill:  { height: "100%", borderRadius: 2 },
});

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function ProfileScreen({ route }) {
  const [data,        setData]        = useState(route.params.data);
  const [activeMatch, setActiveMatch] = useState(null);
  const [refreshing,  setRefreshing]  = useState(false);
  const [activeTab,   setActiveTab]   = useState("partidas");
  const [filterWin,   setFilterWin]   = useState("all"); // all | win | loss
  const [filterChamp, setFilterChamp] = useState("all");
  const [isFav,       setIsFav]       = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState(null);

  const { account, summoner, ranked, matches, hasMore, nextStart } = data;
  const soloQ      = ranked?.find(r => r.queueType === "RANKED_SOLO_5x5");
  const flex       = ranked?.find(r => r.queueType === "RANKED_FLEX_SR");
  const champStats = getChampionStats(matches || [], account.puuid);
  const overall    = getOverallStats(matches || [], account.puuid);
  const streak     = getStreak(matches || [], account.puuid);
  const topChamp   = champStats[0];

  // Campeones únicos para filtro
  const uniqueChamps = [...new Set(
    (matches || []).map(m => m.info?.participants?.find(p => p.puuid === account.puuid)?.championName)
    .filter(Boolean)
  )];

  // Partidas filtradas
  const filteredMatches = (matches || []).filter(m => {
    const me = m.info?.participants?.find(p => p.puuid === account.puuid);
    if (!me) return false;
    if (filterWin === "win"  && !me.win) return false;
    if (filterWin === "loss" &&  me.win) return false;
    if (filterChamp !== "all" && me.championName !== filterChamp) return false;
    return true;
  });

  useEffect(() => {
    checkFavorite();
  }, []);

  async function checkFavorite() {
    try {
      const raw = await AsyncStorage.getItem(FAVORITES_KEY);
      const favs = raw ? JSON.parse(raw) : [];
      setIsFav(favs.some(f => f.puuid === account.puuid));
    } catch (e) {
      console.warn("No se pudieron leer los favoritos:", e.message);
    }
  }

  async function toggleFavorite() {
    try {
      const raw  = await AsyncStorage.getItem(FAVORITES_KEY);
      let favs   = raw ? JSON.parse(raw) : [];
      if (isFav) {
        favs = favs.filter(f => f.puuid !== account.puuid);
      } else {
        favs.push({
          game:     "lol",
          puuid:    account.puuid,
          gameName: account.gameName,
          tagLine:  account.tagLine,
          iconId:   summoner.profileIconId,
          tier:     soloQ?.tier || null,
          rank:     soloQ?.rank || null,
        });
      }
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
      setIsFav(!isFav);
    } catch (e) {
      setError("No se pudo actualizar favoritos: " + errorMessage(e));
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      const fresh = await searchPlayer(account.gameName, account.tagLine);
      setData(fresh);
      setActiveMatch(null);
    } catch (e) {
      setError("No se pudo actualizar: " + errorMessage(e));
    }
    setRefreshing(false);
  }

  async function loadMore() {
    setLoadingMore(true);
    setError(null);
    try {
      const page = await getMoreMatches(account.puuid, nextStart, MATCH_PAGE);
      setData(prev => {
        const known = new Set(prev.matches.map(m => m.metadata.matchId));
        const fresh = page.matches.filter(m => !known.has(m.metadata.matchId));
        return { ...prev, matches: [...prev.matches, ...fresh], hasMore: page.hasMore, nextStart: page.nextStart };
      });
    } catch (e) {
      setError("No se pudieron cargar más partidas: " + errorMessage(e));
    }
    setLoadingMore(false);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c89b3c" />
      }
    >
      {error && (
        <TouchableOpacity style={styles.errorBanner} onPress={() => setError(null)}>
          <Text style={styles.errorText}>⚠ {error}</Text>
        </TouchableOpacity>
      )}

      {/* Perfil */}
      <View style={styles.profileCard}>
        <ProfileIcon iconId={summoner.profileIconId} level={summoner.summonerLevel} size={72} />
        <View style={{ marginLeft: 14, flex: 1 }}>
          <Text style={styles.gameName}>{account.gameName}</Text>
          <Text style={styles.tagLine}>#{account.tagLine}</Text>
          {soloQ && (
            <View style={styles.tierBadge}>
              <Text style={styles.tierBadgeText}>
                {soloQ.tier} {soloQ.rank} · {soloQ.leaguePoints} LP
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={toggleFavorite} style={styles.favBtn}>
          <Text style={styles.favBtnText}>{isFav ? "⭐" : "☆"}</Text>
        </TouchableOpacity>
      </View>

      {/* Racha */}
      {streak && (
        <View style={[styles.streakBanner, {
          backgroundColor: streak.isWin ? "#0d2a1a" : "#2a0d0d",
          borderColor: streak.isWin ? "#4fc97a" : "#e05555",
        }]}>
          <Text style={[styles.streakText, { color: streak.isWin ? "#4fc97a" : "#e05555" }]}>
            {streak.isWin ? "🔥" : "❄️"} Racha de {streak.count} {streak.isWin ? "victorias" : "derrotas"}
          </Text>
        </View>
      )}

      {/* Resumen */}
      <OverallStats stats={overall} topChamp={topChamp} />

      {/* Ranked */}
      {(soloQ || flex) && (
        <View style={styles.rankedRow}>
          {soloQ && <RankedCard entry={soloQ} label="SOLO / DUO" />}
          {soloQ && flex && <View style={{ width: 10 }} />}
          {flex  && <RankedCard entry={flex}  label="FLEX 5v5" />}
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        {["partidas", "campeones"].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === "partidas" ? "🎮 PARTIDAS" : "🏆 CAMPEONES"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Campeones */}
      {activeTab === "campeones" && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>MÁS JUGADOS (últimas {matches?.length} partidas)</Text>
          {champStats.map(c => <ChampionStatsRow key={c.name} champ={c} />)}
        </View>
      )}

      {/* Tab Partidas */}
      {activeTab === "partidas" && (
        <>
          {/* Filtros */}
          <View style={styles.filtersSection}>
            {/* Filtro victoria/derrota */}
            <View style={styles.filterRow}>
              {[
                { key: "all",  label: "Todas" },
                { key: "win",  label: "✓ Victorias" },
                { key: "loss", label: "✗ Derrotas" },
              ].map(f => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterBtn, filterWin === f.key && styles.filterBtnActive]}
                  onPress={() => setFilterWin(f.key)}
                >
                  <Text style={[styles.filterText, filterWin === f.key && styles.filterTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Filtro por campeón */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.champFilter}>
              <TouchableOpacity
                style={[styles.champFilterBtn, filterChamp === "all" && styles.champFilterBtnActive]}
                onPress={() => setFilterChamp("all")}
              >
                <Text style={[styles.champFilterText, filterChamp === "all" && styles.champFilterTextActive]}>
                  Todos
                </Text>
              </TouchableOpacity>
              {uniqueChamps.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.champFilterBtn, filterChamp === c && styles.champFilterBtnActive]}
                  onPress={() => setFilterChamp(filterChamp === c ? "all" : c)}
                >
                  <Image
                    source={{ uri: championIcon(c) }}
                    style={styles.champFilterImg}
                  />
                  <Text style={[styles.champFilterText, filterChamp === c && styles.champFilterTextActive]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <Text style={styles.sectionLabel}>
            {filteredMatches.length} PARTIDAS
          </Text>

          {filteredMatches.map(m => (
            <View key={m.metadata.matchId}>
              <MatchRow
                match={m}
                myPuuid={account.puuid}
                expanded={activeMatch === m.metadata.matchId}
                onPress={() =>
                  setActiveMatch(activeMatch === m.metadata.matchId ? null : m.metadata.matchId)
                }
              />
              {activeMatch === m.metadata.matchId && (
                <MatchDetail match={m} myPuuid={account.puuid} />
              )}
            </View>
          ))}

          {/* Cargar más */}
          <TouchableOpacity
            style={[styles.loadMoreBtn, (loadingMore || !hasMore) && { opacity: 0.5 }]}
            onPress={loadMore}
            disabled={loadingMore || !hasMore}
          >
            <Text style={styles.loadMoreText}>
              {loadingMore ? "Cargando..." : hasMore ? "⬇ Cargar más partidas" : "No hay más partidas"}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: "#070b12" },
  profileCard:        {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#0f1923", borderWidth: 1,
    borderColor: "#1e2a3a", borderRadius: 12, padding: 16, marginBottom: 14,
  },
  gameName:           { color: "#dce8f5", fontWeight: "900", fontSize: 20 },
  tagLine:            { color: "#556677", fontSize: 13 },
  tierBadge:          {
    marginTop: 6, alignSelf: "flex-start",
    backgroundColor: "#0a0e17", paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 20,
  },
  tierBadgeText:      { color: "#c89b3c", fontWeight: "700", fontSize: 12 },
  favBtn:             { padding: 8 },
  favBtnText:         { fontSize: 24 },
  rankedRow:          { flexDirection: "row", marginBottom: 14 },
  streakBanner:       {
    padding: 10, borderRadius: 8, borderWidth: 1,
    marginBottom: 14, alignItems: "center",
  },
  streakText:         { fontWeight: "800", fontSize: 13 },
  tabs:               {
    flexDirection: "row", marginBottom: 14,
    backgroundColor: "#0f1923", borderRadius: 8, padding: 4,
  },
  tab:                { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 6 },
  tabActive:          { backgroundColor: "#1e2a3a" },
  tabText:            { color: "#445566", fontWeight: "700", fontSize: 12, letterSpacing: 1 },
  tabTextActive:      { color: "#c89b3c" },
  card:               {
    backgroundColor: "#0f1923", borderWidth: 1,
    borderColor: "#1e2a3a", borderRadius: 12, padding: 14, marginBottom: 14,
  },
  sectionLabel:       { fontSize: 10, color: "#445566", letterSpacing: 1, marginBottom: 8 },
  filtersSection:     { marginBottom: 12 },
  filterRow:          { flexDirection: "row", gap: 8, marginBottom: 10 },
  filterBtn:          {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, backgroundColor: "#0f1923",
    borderWidth: 1, borderColor: "#1e2a3a",
  },
  filterBtnActive:    { backgroundColor: "#1e2a3a", borderColor: "#c89b3c" },
  filterText:         { color: "#445566", fontSize: 12, fontWeight: "600" },
  filterTextActive:   { color: "#c89b3c" },
  champFilter:        { marginBottom: 4 },
  champFilterBtn:     {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, backgroundColor: "#0f1923",
    borderWidth: 1, borderColor: "#1e2a3a", marginRight: 6,
  },
  champFilterBtnActive: { backgroundColor: "#1e2a3a", borderColor: "#c89b3c" },
  champFilterImg:     { width: 20, height: 20, borderRadius: 4 },
  champFilterText:    { color: "#445566", fontSize: 11, fontWeight: "600" },
  champFilterTextActive: { color: "#c89b3c" },
  loadMoreBtn:        {
    marginTop: 12, padding: 14,
    backgroundColor: "#0f1923", borderWidth: 1,
    borderColor: "#1e2a3a", borderRadius: 10, alignItems: "center",
  },
  loadMoreText:       { color: "#c89b3c", fontWeight: "700", fontSize: 13 },
  errorBanner:        {
    backgroundColor: "#2a0d0d", borderWidth: 1, borderColor: "#e05555",
    borderRadius: 8, padding: 10, marginBottom: 14,
  },
  errorText:          { color: "#e05555", fontSize: 12, fontWeight: "600" },
});