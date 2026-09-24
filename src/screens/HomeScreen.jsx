import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { searchPlayer } from "../api/riot";
import { searchValorantPlayer } from "../api/valorant";
import { searchTFTPlayer } from "../api/tft";
import { profileIconUrl } from "../api/ddragon";
import { FAVORITES_KEY, APP_NAME, APP_TAGLINE } from "../constants/config";
import { errorMessage } from "../utils/lol";
import { Card, SectionLabel } from "../components/ui";
import {
  colors, accents, radii, sizes, spacing, fontSizes, lineHeights, type, tracking, glow, withAlpha, useActiveGame,
} from "../theme";

const GAMES = [
  {
    key:         "lol",
    name:        "League of Legends",
    short:       "LoL",
    icon:        "⚔️",
    placeholder: "Nombre#TAG  (ej: Faker#KR1)",
    screen:      "Profile",
    search:      searchPlayer,
  },
  {
    key:         "valorant",
    name:        "Valorant",
    short:       "VAL",
    icon:        "🎯",
    placeholder: "Nombre#TAG  (ej: TenZ#000)",
    screen:      "Valorant",
    search:      searchValorantPlayer,
  },
  {
    key:         "tft",
    name:        "Teamfight Tactics",
    short:       "TFT",
    icon:        "♟️",
    placeholder: "Nombre#TAG  (ej: Mortdog#TFT)",
    screen:      "TFT",
    search:      searchTFTPlayer,
  },
];

export default function HomeScreen({ navigation }) {
  const { gameKey, setGameKey } = useActiveGame();
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [favorites, setFavorites] = useState([]);

  const activeGame = GAMES.find(g => g.key === gameKey) || GAMES[0];
  const accent     = accents[activeGame.key];

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

        <View style={styles.logo}>
          <Text style={[styles.logoText, { color: accent }, glow(accent, spacing.lg, 0.4)]}>
            {APP_NAME.toUpperCase()}
          </Text>
          <Text style={styles.logoSub}>{APP_TAGLINE.toUpperCase()}</Text>
        </View>

        <View style={styles.gameSelector}>
          {GAMES.map(g => {
            const active = activeGame.key === g.key;
            const color  = accents[g.key];
            return (
              <TouchableOpacity
                key={g.key}
                style={[styles.gameBtn, active && { backgroundColor: withAlpha(color, 0.12), borderColor: color }]}
                onPress={() => { setGameKey(g.key); setInput(""); }}
              >
                <Text style={styles.gameIcon}>{g.icon}</Text>
                <Text style={[styles.gameShort, active && { color }]}>{g.short}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.gameName, { color: accent }]}>{activeGame.name}</Text>

        <View style={styles.searchBox}>
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => handleSearch()}
            placeholder={activeGame.placeholder}
            placeholderTextColor={colors.textFaint}
            style={[styles.input, { borderColor: loading ? accent : colors.border }]}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: accent }, glow(accent, spacing.md, 0.4), loading && styles.disabled]}
            onPress={() => handleSearch()}
            disabled={loading}
          >
            <Text style={styles.btnText}>{loading ? "..." : "🔍"}</Text>
          </TouchableOpacity>
        </View>

        {gameFavs.length > 0 && (
          <View style={styles.favSection}>
            <SectionLabel>⭐ Favoritos — {activeGame.short}</SectionLabel>
            {gameFavs.map(fav => (
              <Card key={fav.puuid} padded={false} style={styles.favRow}>
                <TouchableOpacity style={styles.favInfo} onPress={() => handleSearch(fav.gameName, fav.tagLine)}>
                  {fav.iconId ? (
                    <Image source={{ uri: profileIconUrl(fav.iconId) }} style={[styles.favIcon, { borderColor: accent }]} />
                  ) : (
                    <View style={[styles.favIcon, styles.favIconPlaceholder, { borderColor: accent }]}>
                      <Text style={styles.favEmoji}>{activeGame.icon}</Text>
                    </View>
                  )}
                  <View>
                    <Text style={styles.favName}>{fav.gameName}</Text>
                    <Text style={styles.favTag}>#{fav.tagLine}</Text>
                  </View>
                  {fav.tier && (
                    <View style={styles.favTierBadge}>
                      <Text style={[styles.favTierText, { color: accent }]}>{fav.tier} {fav.rank}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeFavorite(fav.puuid)} style={styles.favRemove}>
                  <Text style={styles.favRemoveText}>✕</Text>
                </TouchableOpacity>
              </Card>
            ))}
          </View>
        )}

        {gameFavs.length === 0 && (
          <Text style={styles.hint}>
            Busca un jugador con formato{"\n"}
            <Text style={{ color: accent }}>Nombre#TAG</Text>
            {"\n\n"}Guarda tus favoritos para acceder{"\n"}rápido desde aquí
          </Text>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: colors.bg },
  inner:              { padding: spacing.xl, paddingTop: spacing.hero },
  logo:               { alignItems: "center", marginBottom: spacing.xxl },
  logoText:           { ...type.brand, fontSize: fontSizes.hero, letterSpacing: tracking.brand },
  logoSub:            { ...type.label, color: colors.textMuted, letterSpacing: tracking.widest, marginTop: spacing.sm },
  gameSelector:       { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md, justifyContent: "center" },
  gameBtn:            {
    flex: 1, alignItems: "center", paddingVertical: spacing.md,
    backgroundColor: colors.surface, borderWidth: sizes.hairline,
    borderColor: colors.border, borderRadius: radii.md,
  },
  gameIcon:           { fontSize: fontSizes.xl, marginBottom: spacing.xs },
  gameShort:          { ...type.label, color: colors.textMuted, fontSize: fontSizes.xs },
  gameName:           { ...type.heading, textAlign: "center", marginBottom: spacing.lg },
  searchBox:          { flexDirection: "row", gap: spacing.md, marginBottom: spacing.xl },
  input:              {
    ...type.body, flex: 1, backgroundColor: colors.surface,
    borderWidth: sizes.hairline, borderRadius: radii.md, padding: spacing.lg, color: colors.text,
  },
  btn:                {
    borderRadius: radii.md, padding: spacing.lg,
    justifyContent: "center", alignItems: "center", width: sizes.button,
  },
  btnText:            { fontSize: fontSizes.xl },
  disabled:           { opacity: 0.6 },
  hint:               { ...type.body, color: colors.textFaint, textAlign: "center", lineHeight: lineHeights.relaxed },
  favSection:         { marginTop: spacing.sm },
  favRow:             { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm, overflow: "hidden" },
  favInfo:            { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  favIcon:            { width: sizes.avatarMd, height: sizes.avatarMd, borderRadius: sizes.avatarMd / 2, borderWidth: sizes.borderThick },
  favIconPlaceholder: { backgroundColor: colors.surfaceHigh, justifyContent: "center", alignItems: "center" },
  favEmoji:           { fontSize: fontSizes.lg },
  favName:            { ...type.bodyStrong, fontSize: fontSizes.base, color: colors.text },
  favTag:             { ...type.small, color: colors.textMuted },
  favTierBadge:       { backgroundColor: colors.bg, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.md },
  favTierText:        { ...type.captionStrong },
  favRemove:          { padding: spacing.lg },
  favRemoveText:      { ...type.body, color: colors.textFaint },
});
