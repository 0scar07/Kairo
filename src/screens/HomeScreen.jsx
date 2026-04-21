import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  Alert, ScrollView, Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { searchPlayer } from "../api/riot";
import { DD } from "../constants/config";

const FAVORITES_KEY = "loltracker_favorites";

export default function HomeScreen({ navigation }) {
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    loadFavorites();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadFavorites);
    return unsubscribe;
  }, [navigation]);

  async function loadFavorites() {
    try {
      const raw = await AsyncStorage.getItem(FAVORITES_KEY);
      if (raw) setFavorites(JSON.parse(raw));
    } catch (_) {}
  }

  async function handleSearch(gameName, tagLine) {
    const name = gameName || input.trim().split("#")[0];
    const tag  = tagLine  || input.trim().split("#")[1];

    if (!name || !tag) {
      Alert.alert("Formato incorrecto", "Usa el formato: Nombre#TAG\nEjemplo: Faker#KR1");
      return;
    }
    setLoading(true);
    try {
      const data = await searchPlayer(name, tag);
      navigation.navigate("Profile", { data, onFavoriteChange: loadFavorites });
    } catch (e) {
      Alert.alert("Error", e.response?.data?.error || "Jugador no encontrado");
    }
    setLoading(false);
  }

  async function removeFavorite(puuid) {
    const updated = favorites.filter(f => f.puuid !== puuid);
    setFavorites(updated);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner}>
        {/* Logo */}
        <View style={styles.logo}>
          <Text style={styles.logoIcon}>⚔️</Text>
          <Text style={styles.logoText}>
            LoL<Text style={{ color: "#c89b3c" }}>Tracker</Text>
          </Text>
          <Text style={styles.logoSub}>STATS & RANKED</Text>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => handleSearch()}
            placeholder="Nombre#TAG  (ej: Faker#KR1)"
            placeholderTextColor="#334455"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.6 }]}
            onPress={() => handleSearch()}
            disabled={loading}
          >
            <Text style={styles.btnText}>{loading ? "..." : "🔍"}</Text>
          </TouchableOpacity>
        </View>

        {/* Favoritos */}
        {favorites.length > 0 && (
          <View style={styles.favSection}>
            <Text style={styles.favLabel}>⭐ FAVORITOS</Text>
            {favorites.map(fav => (
              <View key={fav.puuid} style={styles.favRow}>
                <TouchableOpacity
                  style={styles.favInfo}
                  onPress={() => handleSearch(fav.gameName, fav.tagLine)}
                >
                  <Image
                    source={{ uri: `${DD}/img/profileicon/${fav.iconId}.png` }}
                    style={styles.favIcon}
                  />
                  <View>
                    <Text style={styles.favName}>{fav.gameName}</Text>
                    <Text style={styles.favTag}>#{fav.tagLine}</Text>
                  </View>
                  {fav.tier && (
                    <View style={styles.favTierBadge}>
                      <Text style={styles.favTierText}>{fav.tier} {fav.rank}</Text>
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

        {favorites.length === 0 && (
          <Text style={styles.hint}>
            Busca un invocador con formato{"\n"}
            <Text style={{ color: "#c89b3c" }}>Nombre#TAG</Text>
            {"\n\n"}Guarda tus favoritos para acceder{"\n"}rápido desde aquí
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: "#070b12" },
  inner:        { padding: 24, paddingTop: 60 },
  logo:         { alignItems: "center", marginBottom: 40 },
  logoIcon:     { fontSize: 52, marginBottom: 12 },
  logoText:     { fontSize: 28, fontWeight: "900", color: "#dce8f5", letterSpacing: 2 },
  logoSub:      { fontSize: 11, color: "#445566", letterSpacing: 3, marginTop: 4 },
  searchBox:    { flexDirection: "row", gap: 10, marginBottom: 24 },
  input:        {
    flex: 1, backgroundColor: "#0f1923",
    borderWidth: 1, borderColor: "#1e2a3a",
    borderRadius: 10, padding: 14,
    color: "#dce8f5", fontSize: 14,
  },
  btn:          {
    backgroundColor: "#c89b3c", borderRadius: 10,
    padding: 14, justifyContent: "center", alignItems: "center", width: 50,
  },
  btnText:      { fontSize: 18 },
  hint:         { color: "#334455", fontSize: 13, textAlign: "center", lineHeight: 22 },
  favSection:   { marginTop: 8 },
  favLabel:     { color: "#445566", fontSize: 10, letterSpacing: 1, marginBottom: 10 },
  favRow:       {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#0f1923",
    borderWidth: 1, borderColor: "#1e2a3a",
    borderRadius: 10, marginBottom: 8,
    overflow: "hidden",
  },
  favInfo:      { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  favIcon:      { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: "#c89b3c" },
  favName:      { color: "#dce8f5", fontWeight: "700", fontSize: 14 },
  favTag:       { color: "#556677", fontSize: 12 },
  favTierBadge: {
    backgroundColor: "#0a0e17", paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 12,
  },
  favTierText:  { color: "#c89b3c", fontSize: 11, fontWeight: "700" },
  favRemove:    { padding: 16 },
  favRemoveText:{ color: "#334455", fontSize: 14 },
});