import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Platform, Alert, ScrollView, Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { searchPlayer } from "../api/riot";
import { searchValorantPlayer } from "../api/valorant";
import { searchTFTPlayer } from "../api/tft";
import { profileIconUrl } from "../api/ddragon";
import { FAVORITES_KEY, APP_NAME, APP_TAGLINE } from "../constants/config";
import { errorMessage } from "../utils/lol";

const GAMES = [
  {
    key:         "lol",
    name:        "League of Legends",
    short:       "LoL",
    icon:        "⚔️",
    color:       "#c89b3c",
    placeholder: "Nombre#TAG  (ej: Faker#KR1)",
    screen:      "Profile",
    search:      searchPlayer,
  },
  {
    key:         "valorant",
    name:        "Valorant",
    short:       "VAL",
    icon:        "🎯",
    color:       "#ff4655",
    placeholder: "Nombre#TAG  (ej: TenZ#000)",
    screen:      "Valorant",
    search:      searchValorantPlayer,
  },
  {
    key:         "tft",
    name:        "Teamfight Tactics",
    short:       "TFT",
    icon:        "♟️",
    color:       "#0bc4e3",
    placeholder: "Nombre#TAG  (ej: Mortdog#TFT)",
    screen:      "TFT",
    search:      searchTFTPlayer,
  },
];

export default function HomeScreen({ navigation }) {
  const [input,      setInput]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [favorites,  setFavorites]  = useState([]);
  const [activeGame, setActiveGame] = useState(GAMES[0]);

  useEffect(() => { loadFavorites(); }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadFavorites);
    return unsubscribe;
  }, [navigation]);

  async function loadFavorites() {
    try {
      const raw = await AsyncStorage.getItem(FAVORITES_KEY);
      // Los favoritos antiguos de LoL no tenían campo game
      if (raw) setFavorites(JSON.parse(raw).map(f => ({ ...f, game: f.game || "lol" })));
    } catch (e) {
      console.warn("No se pudieron leer los favoritos:", e.message);
    }
  }

  async function handleSearch(gameName, tagLine) {
    const parts = (gameName || input.trim()).split("#");
    const name  = gameName || parts[0];
    const tag   = tagLine  || parts[1];

    if (!name || !tag) {
      Alert.alert("Formato incorrecto", `Usa el formato: Nombre#TAG\nEjemplo: ${activeGame.placeholder}`);
      return;
    }
    setLoading(true);
    try {
      const data = await activeGame.search(name, tag);
      navigation.navigate(activeGame.screen, { data });
    } catch (e) {
      Alert.alert("Error", e.response?.status === 404 ? "Jugador no encontrado" : errorMessage(e, "Jugador no encontrado"));
    }
    setLoading(false);
  }

  async function removeFavorite(puuid) {
    const updated = favorites.filter(f => f.puuid !== puuid);
    setFavorites(updated);
    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    } catch (e) {
      Alert.alert("Error", "No se pudo guardar los cambios: " + e.message);
    }
  }

  const gameFavs = favorites.filter(f => f.game === activeGame.key);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>

        {/* Logo */}
        <View style={styles.logo}>
          <Text style={styles.logoIcon}>🎮</Text>
          <Text style={styles.logoText}>
            <Text style={{ color: activeGame.color }}>{APP_NAME}</Text>
          </Text>
          <Text style={styles.logoSub}>{APP_TAGLINE.toUpperCase()}</Text>
        </View>

        {/* Selector de juego */}
        <View style={styles.gameSelector}>
          {GAMES.map(g => (
            <TouchableOpacity
              key={g.key}
              style={[styles.gameBtn, activeGame.key === g.key && {
                backgroundColor: `${g.color}20`,
                borderColor: g.color,
              }]}
              onPress={() => { setActiveGame(g); setInput(""); }}
            >
              <Text style={styles.gameIcon}>{g.icon}</Text>
              <Text style={[styles.gameShort, activeGame.key === g.key && { color: g.color }]}>
                {g.short}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Nombre del juego seleccionado */}
        <Text style={[styles.gameName, { color: activeGame.color }]}>
          {activeGame.name}
        </Text>

        {/* Search */}
        <View style={styles.searchBox}>
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => handleSearch()}
            placeholder={activeGame.placeholder}
            placeholderTextColor="#334455"
            style={[styles.input, { borderColor: loading ? activeGame.color : "#1e2a3a" }]}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: activeGame.color }, loading && { opacity: 0.6 }]}
            onPress={() => handleSearch()}
            disabled={loading}
          >
            <Text style={styles.btnText}>{loading ? "..." : "🔍"}</Text>
          </TouchableOpacity>
        </View>

        {/* Favoritos */}
        {gameFavs.length > 0 && (
          <View style={styles.favSection}>
            <Text style={styles.favLabel}>⭐ FAVORITOS — {activeGame.short}</Text>
            {gameFavs.map(fav => (
              <View key={fav.puuid} style={styles.favRow}>
                <TouchableOpacity
                  style={styles.favInfo}
                  onPress={() => handleSearch(fav.gameName, fav.tagLine)}
                >
                  {fav.iconId ? (
                    <Image
                      source={{ uri: profileIconUrl(fav.iconId) }}
                      style={[styles.favIcon, { borderColor: activeGame.color }]}
                    />
                  ) : (
                    <View style={[styles.favIconPlaceholder, { borderColor: activeGame.color }]}>
                      <Text style={{ fontSize: 18 }}>{activeGame.icon}</Text>
                    </View>
                  )}
                  <View>
                    <Text style={styles.favName}>{fav.gameName}</Text>
                    <Text style={styles.favTag}>#{fav.tagLine}</Text>
                  </View>
                  {fav.tier && (
                    <View style={styles.favTierBadge}>
                      <Text style={[styles.favTierText, { color: activeGame.color }]}>
                        {fav.tier} {fav.rank}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeFavorite(fav.puuid)} style={styles.favRemove}>
                  <Text style={styles.favRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {gameFavs.length === 0 && (
          <Text style={styles.hint}>
            Busca un jugador con formato{"\n"}
            <Text style={{ color: activeGame.color }}>Nombre#TAG</Text>
            {"\n\n"}Guarda tus favoritos para acceder{"\n"}rápido desde aquí
          </Text>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: "#070b12" },
  inner:              { padding: 24, paddingTop: 60 },
  logo:               { alignItems: "center", marginBottom: 32 },
  logoIcon:           { fontSize: 48, marginBottom: 10 },
  logoText:           { fontSize: 28, fontWeight: "900", color: "#dce8f5", letterSpacing: 2 },
  logoSub:            { fontSize: 11, color: "#445566", letterSpacing: 3, marginTop: 4 },
  gameSelector:       {
    flexDirection: "row", gap: 8,
    marginBottom: 12, justifyContent: "center",
  },
  gameBtn:            {
    flex: 1, alignItems: "center", paddingVertical: 10,
    backgroundColor: "#0f1923", borderWidth: 1,
    borderColor: "#1e2a3a", borderRadius: 10,
  },
  gameIcon:           { fontSize: 22, marginBottom: 4 },
  gameShort:          { color: "#445566", fontWeight: "800", fontSize: 11, letterSpacing: 1 },
  gameName:           { textAlign: "center", fontWeight: "700", fontSize: 13, marginBottom: 16 },
  searchBox:          { flexDirection: "row", gap: 10, marginBottom: 24 },
  input:              {
    flex: 1, backgroundColor: "#0f1923",
    borderWidth: 1, borderRadius: 10, padding: 14,
    color: "#dce8f5", fontSize: 14,
  },
  btn:                {
    borderRadius: 10, padding: 14,
    justifyContent: "center", alignItems: "center", width: 50,
  },
  btnText:            { fontSize: 18 },
  hint:               { color: "#334455", fontSize: 13, textAlign: "center", lineHeight: 22 },
  favSection:         { marginTop: 8 },
  favLabel:           { color: "#445566", fontSize: 10, letterSpacing: 1, marginBottom: 10 },
  favRow:             {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#0f1923", borderWidth: 1,
    borderColor: "#1e2a3a", borderRadius: 10,
    marginBottom: 8, overflow: "hidden",
  },
  favInfo:            { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  favIcon:            { width: 36, height: 36, borderRadius: 18, borderWidth: 2 },
  favIconPlaceholder: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 2, backgroundColor: "#1e2a3a",
    justifyContent: "center", alignItems: "center",
  },
  favName:            { color: "#dce8f5", fontWeight: "700", fontSize: 14 },
  favTag:             { color: "#556677", fontSize: 12 },
  favTierBadge:       {
    backgroundColor: "#0a0e17", paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 12,
  },
  favTierText:        { fontWeight: "700", fontSize: 11 },
  favRemove:          { padding: 16 },
  favRemoveText:      { color: "#334455", fontSize: 14 },
});