import React, { useCallback, useEffect, useState } from "react";
import { useT } from "../i18n/I18nProvider";
import { View, Text, ScrollView, StyleSheet, Alert, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import FavoriteCard from "../components/FavoriteCard";
import Reveal from "../components/Reveal";
import Animated from "react-native-reanimated";
import { LargeTitle, CompactTitleBar, useLargeTitle } from "../components/LargeTitle";
import GameLogo from "../components/GameLogo";
import { Chip, EmptyState, ErrorBanner, showHud } from "../components/ui";
import { GAMES } from "../games";
import { errorMessage } from "../utils/format";
import { canAlert, loadFavorites, removeFavorite } from "../utils/favorites";
import { useNotifications } from "../notifications/NotificationsProvider";
import { profileTarget } from "../utils/target";
import { useBootData } from "../boot/BootContext";
import { tap, success } from "../utils/haptics";
import { colors, spacing, sizes, fontSizes, type, tracking } from "../theme";

// Todos los favoritos, con filtro por juego
export default function FavoritesScreen({ navigation }) {
  const t = useT();
  const { y, onScroll } = useLargeTitle();
  const [refreshing, setRefreshing] = useState(false);
  // Tirar hacia abajo recarga la lista guardada
  async function onRefresh() {
    tap();
    setRefreshing(true);
    try { setFavorites(await loadFavorites()); setError(null); success(); }
    catch (e) { setError(t("favorites.readError", { error: errorMessage(e) })); }
    setRefreshing(false);
  }
  const { favorites: bootFavorites, gameEnabled } = useBootData();
  const availableGames = GAMES.filter(g => gameEnabled(g.id));
  const [favorites, setFavorites] = useState(bootFavorites);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState(null);
  const { supported, toggleAlerts, favoritesVersion } = useNotifications();

  useFocusEffect(useCallback(() => {
    loadFavorites().then(setFavorites).catch(e => setError(t("favorites.readError", { error: errorMessage(e) })));
  }, []));

  // Una campanita tocada (o la hoja de permiso al terminar) cambia los favoritos guardados: se releen
  useEffect(() => {
    if (favoritesVersion > 0) loadFavorites().then(setFavorites).catch(e => console.warn("No se pudieron recargar los favoritos:", e.message));
  }, [favoritesVersion]);

  const known = favorites.filter(f => availableGames.some(g => g.id === f.gameId));
  const visible = known.filter(f => filter === "all" || f.gameId === filter);

  function open(fav) {
    navigation.navigate("Profile", profileTarget(fav));
  }

  async function remove(fav) {
    setFavorites(prev => prev.filter(f => !(f.gameId === fav.gameId && f.puuid === fav.puuid)));
    try {
      await removeFavorite(fav);
      showHud(t("hud.removed"));
    } catch (e) {
      Alert.alert(t("common.error"), t("favorites.saveError", { error: errorMessage(e) }));
      loadFavorites().then(setFavorites).catch(err => console.warn("No se pudieron recargar los favoritos:", err.message));
    }
  }

  return (
    <View style={styles.container}>
    <Animated.ScrollView
      style={styles.container} contentContainerStyle={styles.content} onScroll={onScroll} scrollEventThrottle={16}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textSecondary} progressBackgroundColor={colors.surface} />}
    >
      <Reveal order={0}>
        <LargeTitle y={y}>{t("favorites.title")}</LargeTitle>
        <Text style={styles.subtitle}>{t("favorites.saved", { count: known.length })}</Text>
      </Reveal>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {known.length > 0 && (
        <Reveal order={1}>
          <View style={styles.filters}>
            <Chip label={t("filters.allPlayers")} active={filter === "all"} onPress={() => setFilter("all")} />
            {availableGames.map(g => (
              <Chip key={g.id} label={g.short} icon={<GameLogo game={g.id} size={sizes.avatarXs} color={filter === g.id ? g.accent : colors.textMuted} muted={filter !== g.id} />} active={filter === g.id} game={g.id} onPress={() => setFilter(g.id)} />
            ))}
          </View>
        </Reveal>
      )}

      {known.length === 0 ? (
        <Reveal order={1}>
          <EmptyState
            icon="star"
            title={t("favorites.emptyTitle")}
            text={t("favorites.emptyText")}
            actionLabel={t("favorites.search")}
            onAction={() => navigation.navigate("Inicio")}
          />
        </Reveal>
      ) : visible.length === 0 ? (
        <EmptyState compact icon="search" title={t("favorites.emptyGame")} />
      ) : (
        <View style={styles.grid}>
          {visible.map((fav, i) => (
            <Reveal key={`${fav.gameId}-${fav.puuid}`} order={Math.min(i, 8) + 2} style={styles.cell}>
              <FavoriteCard fav={fav} onPress={() => open(fav)} onRemove={() => remove(fav)} onToggleAlerts={supported && canAlert(fav) ? () => toggleAlerts(fav) : undefined} />
            </Reveal>
          ))}
        </View>
      )}
    </Animated.ScrollView>
    <CompactTitleBar y={y} title={t("favorites.title")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content:   { padding: spacing.xl, paddingTop: spacing.hero, paddingBottom: sizes.tabBarSpace },
  subtitle:  { ...type.small, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.xl },
  filters:   { flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.lg, rowGap: spacing.sm },
  grid:      { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  cell:      { width: "48%" },
});
