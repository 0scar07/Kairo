import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Image,
} from "react-native";
import { GAMES, UPCOMING_GAMES, getGame } from "../games";
import { profileIconUrl } from "../api/ddragon";
import { APP_NAME, APP_TAGLINE } from "../constants/config";
import { getRegion } from "../constants/regions";
import { errorMessage } from "../utils/format";
import { loadFavorites, removeFavorite } from "../utils/favorites";
import { saveRegion } from "../utils/prefs";
import { Card, SectionLabel } from "../components/ui";
import { RegionButton } from "../components/RegionPicker";
import Reveal from "../components/Reveal";
import { useBootData } from "../boot/BootContext";
import {
  colors, radii, sizes, spacing, fontSizes, lineHeights, type, tracking, glow, withAlpha, useActiveGame,
} from "../theme";

// Espera a que la pantalla de carga se desvanezca antes de empezar la aparición escalonada
const HANDOFF_MS = 250;

export default function HomeScreen({ navigation }) {
  const { gameId, accent, setGameId } = useActiveGame();
  const { favorites: bootFavorites, region: bootRegion, serverOnline, retryServer } = useBootData();
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [favorites, setFavorites] = useState(bootFavorites);
  const [region,    setRegion]    = useState(bootRegion);

  const game = getGame(gameId) || GAMES[0];

  async function refreshFavorites() {
    try {
      setFavorites(await loadFavorites());
    } catch (e) {
      console.warn("No se pudieron leer los favoritos:", e.message);
    }
  }

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", refreshFavorites);
    return unsubscribe;
  }, [navigation]);

  function changeRegion(id) {
    setRegion(id);
    saveRegion(id).catch(e => console.warn("No se pudo guardar la región:", e.message));
  }

  // fav: si se busca desde un favorito se usa su nombre, tag y región
  async function handleSearch(fav) {
    const text = input.trim();
    const cut  = text.lastIndexOf("#");
    const name = fav ? fav.gameName : text.slice(0, cut < 0 ? undefined : cut).trim();
    const tag  = fav ? fav.tagLine  : (cut < 0 ? "" : text.slice(cut + 1).trim());

    if (!name || !tag) {
      Alert.alert("Formato incorrecto", `Usa el formato: Nombre#TAG\nEjemplo: ${game.placeholder.replace(/^Nombre#TAG\s*\(ej: /, "").replace(/\)$/, "")}`);
      return;
    }
    setLoading(true);
    try {
      const data = await game.api.search(name, tag, fav ? fav.region : region);
      navigation.navigate("Profile", { gameId: game.id, data });
    } catch (e) {
      Alert.alert(e.response?.status === 404 ? "Jugador no encontrado" : "Error", errorMessage(e, "No se pudo buscar al jugador"));
    }
    setLoading(false);
  }

  async function onRemoveFavorite(fav) {
    setFavorites(prev => prev.filter(f => !(f.gameId === fav.gameId && f.puuid === fav.puuid)));
    try {
      await removeFavorite(fav.gameId, fav.puuid);
    } catch (e) {
      Alert.alert("Error", "No se pudo guardar los cambios: " + errorMessage(e));
      refreshFavorites();
    }
  }

  const gameFavs = favorites.filter(f => f.gameId === game.id);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">

        {!serverOnline && (
          <Reveal order={0} baseDelay={HANDOFF_MS}>
            <TouchableOpacity style={styles.offline} onPress={retryServer} activeOpacity={0.8}>
              <View style={styles.offlineDot} />
              <Text style={styles.offlineText}>Sin conexión con el servidor · toca para reintentar</Text>
            </TouchableOpacity>
          </Reveal>
        )}

        <Reveal order={0} baseDelay={HANDOFF_MS} style={styles.logo}>
          <Text style={[styles.logoText, { color: accent }, glow(accent, spacing.lg, 0.4)]}>
            {APP_NAME.toUpperCase()}
          </Text>
          <Text style={styles.logoSub}>{APP_TAGLINE.toUpperCase()}</Text>
        </Reveal>

        <Reveal order={1} baseDelay={HANDOFF_MS}>
          <View style={styles.gameSelector}>
            {GAMES.map(g => {
              const active = g.id === game.id;
              return (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.gameBtn, active && { backgroundColor: withAlpha(g.accent, 0.12), borderColor: g.accent }]}
                  onPress={() => setGameId(g.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.gameIcon}>{g.icon}</Text>
                  <Text style={[styles.gameShort, active && { color: g.accent }]}>{g.short}</Text>
                </TouchableOpacity>
              );
            })}
            {UPCOMING_GAMES.map(g => (
              <View key={g.id} style={[styles.gameBtn, styles.gameBtnSoon]}>
                <Text style={styles.gameIcon}>{g.icon}</Text>
                <Text style={styles.gameShort}>{g.short}</Text>
                <Text style={styles.soon}>PRONTO</Text>
              </View>
            ))}
          </View>
        </Reveal>

        <Reveal order={2} baseDelay={HANDOFF_MS}>
          <Text style={[styles.gameName, { color: accent }]}>{game.name}</Text>
        </Reveal>

        <Reveal order={3} baseDelay={HANDOFF_MS}>
          <View style={styles.searchBox}>
            <RegionButton value={region} onChange={changeRegion} disabled={loading} />
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => handleSearch()}
              placeholder={game.placeholder}
              placeholderTextColor={colors.textFaint}
              style={[styles.input, { borderColor: loading ? accent : colors.border }]}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: accent }, glow(accent, spacing.md, 0.4), loading && styles.disabled]}
              onPress={() => handleSearch()}
              disabled={loading}
              accessibilityLabel={`Buscar en ${getRegion(region).name}`}
            >
              <Text style={styles.btnText}>{loading ? "..." : "🔍"}</Text>
            </TouchableOpacity>
          </View>
        </Reveal>

        <Reveal order={4} baseDelay={HANDOFF_MS}>
          {gameFavs.length > 0 ? (
            <View style={styles.favSection}>
              <SectionLabel>⭐ Favoritos — {game.short}</SectionLabel>
              {gameFavs.map(fav => (
                <Card key={`${fav.gameId}-${fav.puuid}`} padded={false} style={styles.favRow}>
                  <TouchableOpacity style={styles.favInfo} onPress={() => handleSearch(fav)}>
                    {fav.iconId != null ? (
                      <Image source={{ uri: profileIconUrl(fav.iconId) }} style={[styles.favIcon, { borderColor: accent }]} />
                    ) : (
                      <View style={[styles.favIcon, styles.favIconPlaceholder, { borderColor: accent }]}>
                        <Text style={styles.favEmoji}>{game.icon}</Text>
                      </View>
                    )}
                    <View style={styles.favText}>
                      <Text style={styles.favName} numberOfLines={1}>{fav.gameName}</Text>
                      <Text style={styles.favTag}>#{fav.tagLine} · {getRegion(fav.region).label}</Text>
                    </View>
                    {fav.tier && (
                      <View style={styles.favTierBadge}>
                        <Text style={[styles.favTierText, { color: colors.tier[fav.tier] || accent }]}>{fav.tier} {fav.rank}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onRemoveFavorite(fav)} style={styles.favRemove} accessibilityLabel="Quitar de favoritos">
                    <Text style={styles.favRemoveText}>✕</Text>
                  </TouchableOpacity>
                </Card>
              ))}
            </View>
          ) : (
            <Text style={styles.hint}>
              Busca un jugador con formato{"\n"}
              <Text style={{ color: accent }}>Nombre#TAG</Text>
              {"\n\n"}Guarda tus favoritos para acceder{"\n"}rápido desde aquí
            </Text>
          )}
        </Reveal>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: colors.bg },
  inner:              { padding: spacing.xl, paddingTop: spacing.hero },
  offline:            {
    flexDirection: "row", alignItems: "center", alignSelf: "center", gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginBottom: spacing.lg,
    borderRadius: radii.pill, borderWidth: sizes.hairline,
    borderColor: withAlpha(colors.loss, 0.4), backgroundColor: withAlpha(colors.loss, 0.1),
  },
  offlineDot:         { width: sizes.dot, height: sizes.dot, borderRadius: sizes.dot / 2, backgroundColor: colors.loss },
  offlineText:        { ...type.caption, color: colors.textSecondary },
  logo:               { alignItems: "center", marginBottom: spacing.xxl },
  logoText:           { ...type.brand, fontSize: fontSizes.hero, letterSpacing: tracking.brand },
  logoSub:            { ...type.label, color: colors.textMuted, letterSpacing: tracking.widest, marginTop: spacing.sm },
  gameSelector:       { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md, justifyContent: "center" },
  gameBtn:            {
    flex: 1, alignItems: "center", paddingVertical: spacing.md,
    backgroundColor: colors.surface, borderWidth: sizes.hairline,
    borderColor: colors.border, borderRadius: radii.md,
  },
  gameBtnSoon:        { opacity: 0.45 },
  gameIcon:           { fontSize: fontSizes.xl, marginBottom: spacing.xs },
  gameShort:          { ...type.label, color: colors.textMuted, fontSize: fontSizes.xs },
  soon:               { ...type.micro, color: colors.textMuted, marginTop: spacing.xxs },
  gameName:           { ...type.heading, textAlign: "center", marginBottom: spacing.lg },
  searchBox:          { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xl },
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
  favText:            { flex: 1 },
  favName:            { ...type.bodyStrong, fontSize: fontSizes.base, color: colors.text },
  favTag:             { ...type.small, color: colors.textMuted },
  favTierBadge:       { backgroundColor: colors.bg, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.md },
  favTierText:        { ...type.captionStrong },
  favRemove:          { padding: spacing.lg },
  favRemoveText:      { ...type.body, color: colors.textFaint },
});
