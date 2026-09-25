import React, { useCallback, useState } from "react";
import { useT } from "../i18n/I18nProvider";
import { View, Text, ScrollView, StyleSheet, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import FavoriteCard from "../components/FavoriteCard";
import Reveal from "../components/Reveal";
import GameLogo from "../components/GameLogo";
import { Chip, EmptyState, ErrorBanner } from "../components/ui";
import { GAMES } from "../games";
import { errorMessage } from "../utils/format";
import { loadFavorites, removeFavorite } from "../utils/favorites";
import { profileTarget } from "../utils/target";
import { useBootData } from "../boot/BootContext";
import { colors, spacing, sizes, fontSizes, type, tracking } from "../theme";

// Todos los favoritos, con filtro por juego
export default function FavoritesScreen({ navigation }) {
  const t = useT();
  const { favorites: bootFavorites, gameEnabled } = useBootData();
  const availableGames = GAMES.filter(g => gameEnabled(g.id));
  const [favorites, setFavorites] = useState(bootFavorites);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState(null);

  useFocusEffect(useCallback(() => {
    loadFavorites().then(setFavorites).catch(e => setError(t("favorites.readError", { error: errorMessage(e) })));
  }, []));

  const known = favorites.filter(f => availableGames.some(g => g.id === f.gameId));
  const visible = known.filter(f => filter === "all" || f.gameId === filter);

  function open(fav) {
    navigation.navigate("Profile", profileTarget(fav));
  }

  async function remove(fav) {
    setFavorites(prev => prev.filter(f => !(f.gameId === fav.gameId && f.puuid === fav.puuid)));
    try {
      await removeFavorite(fav);
    } catch (e) {
      Alert.alert(t("common.error"), t("favorites.saveError", { error: errorMessage(e) }));
      loadFavorites().then(setFavorites).catch(err => console.warn("No se pudieron recargar los favoritos:", err.message));
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Reveal order={0}>
        <Text style={styles.title}>{t("favorites.title").toUpperCase()}</Text>
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
              <FavoriteCard fav={fav} onPress={() => open(fav)} onRemove={() => remove(fav)} />
            </Reveal>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content:   { padding: spacing.xl, paddingTop: spacing.hero, paddingBottom: sizes.tabBarSpace },
  title:     { ...type.brand, fontSize: fontSizes.xxl, letterSpacing: tracking.widest, color: colors.text },
  subtitle:  { ...type.small, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.xl },
  filters:   { flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.lg, rowGap: spacing.sm },
  grid:      { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  cell:      { width: "48%" },
});
