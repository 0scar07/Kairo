import React, { useCallback, useState } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet, Alert, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { GAMES, UPCOMING_GAMES, getGame } from "../games";
import { APP_NAME, APP_TAGLINE } from "../constants/config";
import { getRegion } from "../constants/regions";
import { errorMessage } from "../utils/format";
import { loadFavorites, removeFavorite } from "../utils/favorites";
import { loadRecents, clearRecents } from "../utils/recents";
import { select } from "../utils/haptics";
import { Card, SectionLabel, PressableScale, EmptyState } from "../components/ui";
import { RegionButton } from "../components/RegionPicker";
import FavoriteCard from "../components/FavoriteCard";
import Icon from "../components/Icon";
import Reveal from "../components/Reveal";
import { useBootData } from "../boot/BootContext";
import {
  colors, radii, sizes, spacing, fontSizes, type, tracking, glow, withAlpha, useActiveGame,
} from "../theme";

// Espera a que la pantalla de carga se desvanezca antes de empezar la aparición escalonada
const HANDOFF_MS = 250;
const FAVORITES_PREVIEW = 4;

export default function HomeScreen({ navigation }) {
  const { gameId, accent, setGameId } = useActiveGame();
  const {
    favorites: bootFavorites, recents: bootRecents, region, setRegion, serverOnline, retryServer,
  } = useBootData();
  const [input,     setInput]     = useState("");
  const [favorites, setFavorites] = useState(bootFavorites);
  const [recents,   setRecents]   = useState(bootRecents);

  const game = getGame(gameId) || GAMES[0];

  useFocusEffect(useCallback(() => {
    loadFavorites().then(setFavorites).catch(e => console.warn("No se pudieron leer los favoritos:", e.message));
    loadRecents().then(setRecents).catch(e => console.warn("No se pudieron leer las búsquedas recientes:", e.message));
  }, []));

  function openProfile(target) {
    navigation.navigate("Profile", target);
  }

  function handleSearch() {
    const text = input.trim();
    const cut  = text.lastIndexOf("#");
    const name = (cut < 0 ? text : text.slice(0, cut)).trim();
    const tag  = cut < 0 ? "" : text.slice(cut + 1).trim();

    if (!name || !tag) {
      Alert.alert("Formato incorrecto", "Escribe el Riot ID completo: Nombre#TAG\nEjemplo: Hide on bush#KR1");
      return;
    }
    openProfile({ gameId: game.id, gameName: name, tagLine: tag, region });
  }

  async function onRemoveFavorite(fav) {
    setFavorites(prev => prev.filter(f => !(f.gameId === fav.gameId && f.puuid === fav.puuid)));
    try {
      await removeFavorite(fav.gameId, fav.puuid);
    } catch (e) {
      Alert.alert("Error", "No se pudo guardar los cambios: " + errorMessage(e));
      loadFavorites().then(setFavorites).catch(() => {});
    }
  }

  async function onClearRecents() {
    setRecents([]);
    try {
      await clearRecents();
    } catch (e) {
      Alert.alert("Error", "No se pudieron borrar las búsquedas: " + errorMessage(e));
    }
  }

  const gameFavs = favorites.filter(f => f.gameId === game.id);
  const shownFavs = gameFavs.slice(0, FAVORITES_PREVIEW);

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

        {/* Encabezado */}
        <Reveal order={0} baseDelay={HANDOFF_MS} style={styles.header}>
          <Text style={[styles.logoText, { color: accent }, glow(accent, spacing.lg, 0.4)]}>{APP_NAME.toUpperCase()}</Text>
          <Text style={styles.logoSub}>{APP_TAGLINE.toUpperCase()}</Text>
        </Reveal>

        {/* Buscador destacado */}
        <Reveal order={1} baseDelay={HANDOFF_MS}>
          <Card style={[styles.searchCard, { borderColor: withAlpha(accent, 0.45) }, glow(accent, spacing.xl, 0.18)]}>
            <SectionLabel>Buscar en {game.name}</SectionLabel>
            <View style={styles.searchRow}>
              <RegionButton value={region} onChange={setRegion} />
              <TextInput
                value={input}
                onChangeText={setInput}
                onSubmitEditing={handleSearch}
                placeholder={game.placeholder}
                placeholderTextColor={colors.textFaint}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              <PressableScale
                haptic
                onPress={handleSearch}
                scaleTo={0.92}
                style={[styles.go, { backgroundColor: accent }, glow(accent, spacing.md, 0.45)]}
                accessibilityLabel={`Buscar en ${getRegion(region).name}`}
              >
                <Icon name="search" size={sizes.item} color={colors.onAccent} />
              </PressableScale>
            </View>
          </Card>
        </Reveal>

        {/* Selector de juego */}
        <Reveal order={2} baseDelay={HANDOFF_MS}>
          <View style={styles.gameSelector}>
            {GAMES.map(g => {
              const active = g.id === game.id;
              return (
                <PressableScale
                  key={g.id}
                  scaleTo={0.95}
                  onPress={() => { if (!active) { select(); setGameId(g.id); } }}
                  style={[styles.gameBtn, active && { backgroundColor: withAlpha(g.accent, 0.14), borderColor: g.accent }]}
                >
                  <Text style={styles.gameIcon}>{g.icon}</Text>
                  <Text style={[styles.gameShort, active && { color: g.accent }]}>{g.short}</Text>
                </PressableScale>
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

        {/* Búsquedas recientes */}
        {recents.length > 0 && (
          <Reveal order={3} baseDelay={HANDOFF_MS}>
            <View style={styles.sectionHeader}>
              <SectionLabel style={styles.sectionLabel}>Recientes</SectionLabel>
              <TouchableOpacity onPress={onClearRecents} hitSlop={spacing.md}>
                <Text style={styles.link}>Borrar</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recents}>
              {recents.filter(r => getGame(r.gameId)).map(r => (
                <PressableScale
                  key={`${r.gameId}-${r.region}-${r.gameName}-${r.tagLine}`}
                  scaleTo={0.94}
                  haptic
                  onPress={() => openProfile({ gameId: r.gameId, gameName: r.gameName, tagLine: r.tagLine, region: r.region })}
                  style={styles.recent}
                >
                  <Text style={styles.recentIcon}>{getGame(r.gameId).icon}</Text>
                  <Text style={styles.recentText} numberOfLines={1}>{r.gameName}<Text style={styles.recentTag}> #{r.tagLine}</Text></Text>
                </PressableScale>
              ))}
            </ScrollView>
          </Reveal>
        )}

        {/* Favoritos */}
        <Reveal order={4} baseDelay={HANDOFF_MS}>
          <View style={styles.sectionHeader}>
            <SectionLabel style={styles.sectionLabel}>⭐ Favoritos — {game.short}</SectionLabel>
            {gameFavs.length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate("Favoritos")} hitSlop={spacing.md}>
                <Text style={styles.link}>Ver todos</Text>
              </TouchableOpacity>
            )}
          </View>
          {shownFavs.length > 0 ? (
            <View style={styles.grid}>
              {shownFavs.map(fav => (
                <FavoriteCard
                  key={`${fav.gameId}-${fav.puuid}`}
                  fav={fav}
                  style={styles.cell}
                  onPress={() => openProfile({ gameId: fav.gameId, gameName: fav.gameName, tagLine: fav.tagLine, region: fav.region })}
                  onRemove={() => onRemoveFavorite(fav)}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              compact
              icon="⭐"
              title="Sin favoritos en este juego"
              text="Busca un jugador y toca la estrella de su perfil para tenerlo siempre a mano."
            />
          )}
        </Reveal>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.bg },
  inner:         { padding: spacing.xl, paddingTop: spacing.hero, paddingBottom: sizes.tabBarSpace },
  offline:       {
    flexDirection: "row", alignItems: "center", alignSelf: "center", gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginBottom: spacing.lg,
    borderRadius: radii.pill, borderWidth: sizes.hairline,
    borderColor: withAlpha(colors.loss, 0.4), backgroundColor: withAlpha(colors.loss, 0.1),
  },
  offlineDot:    { width: sizes.dot, height: sizes.dot, borderRadius: sizes.dot / 2, backgroundColor: colors.loss },
  offlineText:   { ...type.caption, color: colors.textSecondary },
  header:        { marginBottom: spacing.xl },
  logoText:      { ...type.brand, fontSize: fontSizes.hero, letterSpacing: tracking.brand },
  logoSub:       { ...type.label, color: colors.textMuted, letterSpacing: tracking.widest, marginTop: spacing.sm },
  searchCard:    { padding: spacing.lg },
  searchRow:     { flexDirection: "row", gap: spacing.sm, alignItems: "stretch" },
  input:         {
    ...type.body, flex: 1, backgroundColor: colors.bg, borderWidth: sizes.hairline, borderColor: colors.border,
    borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, color: colors.text,
  },
  go:            { width: sizes.button, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  gameSelector:  { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xl },
  gameBtn:       {
    flex: 1, alignItems: "center", paddingVertical: spacing.md,
    backgroundColor: colors.surface, borderWidth: sizes.hairline,
    borderColor: colors.border, borderRadius: radii.lg,
  },
  gameBtnSoon:   { opacity: 0.45 },
  gameIcon:      { fontSize: fontSizes.xxl, marginBottom: spacing.xs },
  gameShort:     { ...type.label, color: colors.textMuted, fontSize: fontSizes.xs },
  soon:          { ...type.micro, color: colors.textMuted, marginTop: spacing.xxs },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  sectionLabel:  { marginBottom: 0 },
  link:          { ...type.smallStrong, color: colors.textSecondary },
  recents:       { marginBottom: spacing.xl },
  recent:        {
    flexDirection: "row", alignItems: "center", gap: spacing.sm, maxWidth: sizes.iconHero * 2,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginRight: spacing.sm,
    borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: sizes.hairline, borderColor: colors.border,
  },
  recentIcon:    { fontSize: fontSizes.base },
  recentText:    { ...type.smallStrong, color: colors.text, flexShrink: 1 },
  recentTag:     { color: colors.textMuted },
  grid:          { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  cell:          { width: "48%" },
});
