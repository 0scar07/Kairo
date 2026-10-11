import React, { useCallback, useEffect, useState } from "react";
import { useT } from "../i18n/I18nProvider";
import { View, Text, TextInput, ScrollView, StyleSheet, Alert, TouchableOpacity, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { GAMES, UPCOMING_GAMES, getGame } from "../games";
import { regionName } from "../constants/regions";
import { errorMessage } from "../utils/format";
import { GLOBAL_REGION, tagOf } from "../utils/supercell";
import { profileTarget } from "../utils/target";
import { loadPlatforms, savePlatform } from "../utils/prefs";
import { loadFavorites, removeFavorite } from "../utils/favorites";
import { loadRecents, clearRecents } from "../utils/recents";
import { select, warning } from "../utils/haptics";
import { Card, SectionLabel, PressableScale, EmptyState, showHud } from "../components/ui";
import { RegionButton } from "../components/RegionPicker";
import FavoriteCard from "../components/FavoriteCard";
import Icon from "../components/Icon";
import Reveal from "../components/Reveal";
import Animated from "react-native-reanimated";
import { LargeTitle, CompactTitleBar, useLargeTitle } from "../components/LargeTitle";
import GameLogo from "../components/GameLogo";
import { useBootData } from "../boot/BootContext";
import {
  colors, radii, sizes, spacing, fontSizes, lineHeights, type, withAlpha, useActiveGame,
} from "../theme";

// Espera a que la pantalla de carga se desvanezca antes de empezar la aparición escalonada
const HANDOFF_MS = 250;
const FAVORITES_PREVIEW = 4;

export default function HomeScreen({ navigation }) {
  const t = useT();
  const { gameId, accent, setGameId } = useActiveGame();
  const {
    favorites: bootFavorites, recents: bootRecents, region, setRegion, serverOnline, retryServer, gameEnabled,
  } = useBootData();
  const [input,     setInput]     = useState("");
  const [favorites, setFavorites] = useState(bootFavorites);
  const [recents,   setRecents]   = useState(bootRecents);
  const [platforms, setPlatforms] = useState({});   // plataforma elegida por juego (Fortnite, Apex, PUBG…)
  const [error,     setError]     = useState(null); // formato incorrecto: se muestra bajo el buscador, sin alertas
  const { y, onScroll } = useLargeTitle();
  const [focused, setFocused] = useState(false);

  const game = getGame(gameId) || GAMES[0];
  const Extras = game.HomeExtras;
  const platform = game.platforms ? (platforms[game.id] || game.platforms[0].id) : null;

  useEffect(() => { loadPlatforms().then(setPlatforms); }, []);
  useEffect(() => { setInput(""); setError(null); }, [game.id]);   // lo escrito para un juego no vale para otro

  function changePlatform(id) {
    setPlatforms(prev => ({ ...prev, [game.id]: id }));
    savePlatform(game.id, id).catch(e => console.warn("No se pudo guardar la plataforma:", e.message));
  }

  // Si el juego activo dejó de estar disponible (la key no tiene esa API), se pasa al primero que sí lo esté
  useEffect(() => {
    if (!gameEnabled(gameId)) {
      const first = GAMES.find(g => gameEnabled(g.id));
      if (first) setGameId(first.id);
    }
  }, [gameId, gameEnabled]);

  useFocusEffect(useCallback(() => {
    loadFavorites().then(setFavorites).catch(e => console.warn("No se pudieron leer los favoritos:", e.message));
    loadRecents().then(setRecents).catch(e => console.warn("No se pudieron leer las búsquedas recientes:", e.message));
  }, []));

  function openProfile(target) {
    navigation.navigate("Profile", target);
  }

  function invalid(message) {
    warning();
    setError(message);
  }

  function handleSearch() {
    const text = input.trim();
    setError(null);

    // Juegos de Supercell: se busca solo por el tag (#2PP0) y no hay regiones
    if (game.tagSearch) {
      const tag = tagOf(text);
      if (tag.length < 3) {
        invalid(t("home.badTag"));
        return;
      }
      openProfile({ gameId: game.id, gameName: "", tagLine: tag, region: GLOBAL_REGION });
      return;
    }

    // Juegos que se buscan por nombre (Dota 2, Fortnite, Apex, PUBG): una plataforma opcional y, en Dota 2, una lista de resultados
    if (game.search === "name") {
      if (text.length < 2) {
        invalid(t("home.badName"));
        return;
      }
      const target = { gameId: game.id, gameName: text, tagLine: "", region: platform || GLOBAL_REGION };
      if (game.searchResults && !/^\d+$/.test(text)) navigation.navigate("SearchResults", { gameId: game.id, query: text, region: target.region });
      else openProfile(target);
      return;
    }

    const cut  = text.lastIndexOf("#");
    const name = (cut < 0 ? text : text.slice(0, cut)).trim();
    const tag  = cut < 0 ? "" : text.slice(cut + 1).trim();

    if (!name || !tag) {
      invalid(t("home.badRiotId"));
      return;
    }
    openProfile({ gameId: game.id, gameName: name, tagLine: tag, region });
  }

  async function onRemoveFavorite(fav) {
    setFavorites(prev => prev.filter(f => !(f.gameId === fav.gameId && f.puuid === fav.puuid)));
    try {
      await removeFavorite(fav);
      showHud(t("hud.removed"));
    } catch (e) {
      Alert.alert(t("common.error"), t("favorites.saveError", { error: errorMessage(e) }));
      loadFavorites().then(setFavorites).catch(err => console.warn("No se pudieron recargar los favoritos:", err.message));
    }
  }

  async function onClearRecents() {
    setRecents([]);
    try {
      await clearRecents();
    } catch (e) {
      Alert.alert(t("common.error"), t("home.clearError", { error: errorMessage(e) }));
    }
  }

  const gameFavs = favorites.filter(f => f.gameId === game.id);
  const shownFavs = gameFavs.slice(0, FAVORITES_PREVIEW);

  return (
    <View style={styles.container}>
      <Animated.ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled" onScroll={onScroll} scrollEventThrottle={16}>

        {!serverOnline && (
          <Reveal order={0} baseDelay={HANDOFF_MS}>
            <TouchableOpacity style={styles.offline} onPress={retryServer} activeOpacity={0.8} accessibilityRole="button">
              <View style={styles.offlineDot} />
              <Text style={styles.offlineText}>{t("home.offline")}</Text>
            </TouchableOpacity>
          </Reveal>
        )}

        {/* Encabezado */}
        <Reveal order={0} baseDelay={HANDOFF_MS} style={styles.header}>
          <LargeTitle y={y}>{t("home.title")}</LargeTitle>
          <Text style={styles.subtitle}>{t("app.tagline")}</Text>
        </Reveal>

        {/* Buscador destacado */}
        <Reveal order={1} baseDelay={HANDOFF_MS}>
          <Card style={[styles.searchCard, { borderColor: withAlpha(accent, error ? 0 : 0.35) }, error && styles.searchCardError]}>
            <SectionLabel>{t("home.searchIn", { game: game.name })}</SectionLabel>
            <View style={styles.searchRow}>
              {game.hasRegion === false
                ? (game.platforms ? (
                  <RegionButton
                    value={platform} onChange={changePlatform} options={game.platforms} nameOf={null}
                    title={t("platform.title")} label={t("platform.choose")}
                  />
                ) : null)
                : <RegionButton value={region} onChange={setRegion} />}
              <View style={[styles.field, focused && { borderColor: withAlpha(accent, 0.7) }]}>
              <Icon name="search" size={fontSizes.lg} color={colors.textMuted} />
              <TextInput
                value={input}
                onChangeText={v => { setInput(v); if (error) setError(null); }}
                onSubmitEditing={handleSearch}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                accessibilityLabel={t("home.searchIn", { game: game.name })}
                accessibilityHint={error || undefined}
                placeholder={game.tagSearch ? t("home.placeholderTag") : game.search === "name" ? t(game.searchResults ? "home.placeholderNameOrId" : "home.placeholderName") : t("home.placeholderRiotId")}
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {input ? (
                <PressableScale
                  onPress={() => { setInput(""); setError(null); }}
                  scaleTo={0.85} hitSlop={spacing.sm} style={styles.clear}
                  accessibilityLabel={t("home.clearInput")}
                >
                  <Icon name="close" size={fontSizes.sm} color={colors.bg} strokeWidth={3} />
                </PressableScale>
              ) : null}
              </View>
              <PressableScale
                haptic
                onPress={handleSearch}
                scaleTo={0.92}
                style={[styles.go, { backgroundColor: accent }]}
                accessibilityLabel={t("home.searchIn", { game: game.hasRegion === false ? game.name : regionName(region) })}
              >
                <Icon name="search" size={sizes.item} color={colors.onAccent} />
              </PressableScale>
            </View>
            {error ? (
              <View style={styles.errorRow} accessibilityLiveRegion="polite">
                <Icon name="alert" size={fontSizes.md} color={colors.loss} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </Card>
        </Reveal>

        {/* Selector de juego */}
        <Reveal order={2} baseDelay={HANDOFF_MS}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gameScroll} contentContainerStyle={styles.gameSelector}>
            {[...GAMES].sort((a, b) => gameEnabled(b.id) - gameEnabled(a.id)).map(g => {
              const active = g.id === game.id;
              // Un juego que la key del servidor no puede consultar aparece como "PRONTO"
              if (!gameEnabled(g.id)) {
                return (
                  <View key={g.id} style={[styles.gameBtn, styles.gameBtnSoon]} accessible accessibilityLabel={`${g.name}, ${t("home.soon")}`}>
                    <GameLogo game={g.id} style={styles.gameIcon} size={sizes.avatarSm} color={colors.textFaint} muted />
                    <Text style={styles.gameShort}>{g.short}</Text>
                    <Text style={styles.soon}>{t("home.soon")}</Text>
                  </View>
                );
              }
              return (
                <PressableScale
                  key={g.id}
                  scaleTo={0.95}
                  onPress={() => { if (!active) { select(); setGameId(g.id); } }}
                  accessibilityLabel={g.name}
                  accessibilityState={{ selected: active }}
                  style={[styles.gameBtn, active && { backgroundColor: withAlpha(g.accent, 0.14), borderColor: g.accent }]}
                >
                  <GameLogo game={g.id} style={styles.gameIcon} size={sizes.avatarSm} color={active ? g.accent : colors.textMuted} muted={!active} />
                  <Text style={[styles.gameShort, active && { color: g.accent }]}>{g.short}</Text>
                </PressableScale>
              );
            })}
            {UPCOMING_GAMES.map(g => (
              <View key={g.id} style={[styles.gameBtn, styles.gameBtnSoon]} accessible accessibilityLabel={`${g.name}, ${t("home.soon")}`}>
                <GameLogo game={g.id} style={styles.gameIcon} size={sizes.avatarSm} color={colors.textFaint} muted />
                <Text style={styles.gameShort}>{g.short}</Text>
                <Text style={styles.soon}>{t("home.soon")}</Text>
              </View>
            ))}
          </ScrollView>
        </Reveal>

        {/* Extras propios del juego (LoL: estado del servidor y rotación gratuita) */}
        {Extras && (
          <Reveal order={3} baseDelay={HANDOFF_MS}>
            <Extras region={region} />
          </Reveal>
        )}

        {/* Búsquedas recientes */}
        {recents.length > 0 && (
          <Reveal order={4} baseDelay={HANDOFF_MS}>
            <View style={styles.sectionHeader}>
              <SectionLabel style={styles.sectionLabel}>{t("home.recents")}</SectionLabel>
              <TouchableOpacity onPress={onClearRecents} hitSlop={spacing.md} accessibilityRole="button">
                <Text style={styles.link}>{t("home.clear")}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recents}>
              {recents.filter(r => getGame(r.gameId)).map(r => (
                <PressableScale
                  key={`${r.gameId}-${r.region}-${r.gameName}-${r.tagLine}`}
                  scaleTo={0.94}
                  haptic
                  onPress={() => openProfile(profileTarget(r))}
                  style={styles.recent}
                >
                  <GameLogo game={r.gameId} size={sizes.avatarXs} color={getGame(r.gameId).accent} />
                  <Text style={styles.recentText} numberOfLines={1}>{r.gameName}{r.tagLine ? <Text style={styles.recentTag}> #{r.tagLine}</Text> : null}</Text>
                </PressableScale>
              ))}
            </ScrollView>
          </Reveal>
        )}

        {/* Favoritos */}
        <Reveal order={5} baseDelay={HANDOFF_MS}>
          <View style={styles.sectionHeader}>
            <SectionLabel style={styles.sectionLabel} icon="star" iconColor={colors.gold}>{t("home.favoritesOf", { game: game.short })}</SectionLabel>
            {gameFavs.length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate("Favoritos")} hitSlop={spacing.md} accessibilityRole="button">
                <Text style={styles.link}>{t("home.seeAll")}</Text>
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
                  onPress={() => openProfile(profileTarget(fav))}
                  onRemove={() => onRemoveFavorite(fav)}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              compact
              icon="star"
              title={t("home.noFavorites")}
              text={t("home.noFavoritesText")}
            />
          )}
        </Reveal>

      </Animated.ScrollView>
      <CompactTitleBar y={y} title={t("home.title")} />
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
  subtitle:      { ...type.body, color: colors.textSecondary, marginTop: spacing.xs },
  searchCard:    { padding: spacing.lg },
  searchCardError: { borderColor: withAlpha(colors.loss, 0.6) },
  errorRow:      { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginTop: spacing.md },
  errorText:     { ...type.small, color: colors.text, flex: 1, lineHeight: lineHeights.small + 2 },
  searchRow:     { flexDirection: "row", gap: spacing.sm, alignItems: "stretch" },
  field:         {
    flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.bg, borderWidth: sizes.hairline, borderColor: colors.border,
    borderRadius: radii.md, paddingHorizontal: spacing.md,
  },
  // En la web el foco lo marca el borde del campo (el contorno del navegador queda fuera de lugar)
  input:         { ...type.body, flex: 1, minWidth: 0, paddingVertical: spacing.md, color: colors.text, ...(Platform.OS === "web" ? { outlineStyle: "none" } : null) },
  clear:         {
    width: sizes.avatarXs, height: sizes.avatarXs, borderRadius: radii.pill,
    backgroundColor: colors.textMuted, alignItems: "center", justifyContent: "center",
  },
  go:            { width: sizes.button, flexShrink: 0, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  gameScroll:    { marginBottom: spacing.xl, marginHorizontal: -spacing.xl },
  gameSelector:  { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.xl },
  gameBtn:       {
    width: sizes.iconHero - spacing.sm, alignItems: "center", paddingVertical: spacing.md,
    backgroundColor: colors.surface, borderWidth: sizes.hairline,
    borderColor: colors.border, borderRadius: radii.lg,
  },
  gameBtnSoon:   { opacity: 0.45 },
  gameIcon:      { marginBottom: spacing.xs },
  gameShort:     { ...type.label, color: colors.textMuted },
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
  recentText:    { ...type.smallStrong, color: colors.text, flexShrink: 1 },
  recentTag:     { color: colors.textMuted },
  grid:          { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  cell:          { width: "48%" },
});
