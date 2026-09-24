import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import FavoriteCard from "../components/FavoriteCard";
import Reveal from "../components/Reveal";
import { Chip, EmptyState, ErrorBanner } from "../components/ui";
import { GAMES } from "../games";
import { errorMessage } from "../utils/format";
import { loadFavorites, removeFavorite } from "../utils/favorites";
import { useBootData } from "../boot/BootContext";
import { colors, spacing, sizes, fontSizes, type, tracking } from "../theme";

// Todos los favoritos, con filtro por juego
export default function FavoritesScreen({ navigation }) {
  const { favorites: bootFavorites } = useBootData();
  const [favorites, setFavorites] = useState(bootFavorites);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState(null);

  useFocusEffect(useCallback(() => {
    loadFavorites().then(setFavorites).catch(e => setError("No se pudieron leer los favoritos: " + errorMessage(e)));
  }, []));

  const known = favorites.filter(f => GAMES.some(g => g.id === f.gameId));
  const visible = known.filter(f => filter === "all" || f.gameId === filter);

  function open(fav) {
    navigation.navigate("Profile", { gameId: fav.gameId, gameName: fav.gameName, tagLine: fav.tagLine, region: fav.region });
  }

  async function remove(fav) {
    setFavorites(prev => prev.filter(f => !(f.gameId === fav.gameId && f.puuid === fav.puuid)));
    try {
      await removeFavorite(fav.gameId, fav.puuid);
    } catch (e) {
      Alert.alert("Error", "No se pudo guardar los cambios: " + errorMessage(e));
      loadFavorites().then(setFavorites).catch(err => console.warn("No se pudieron recargar los favoritos:", err.message));
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Reveal order={0}>
        <Text style={styles.title}>FAVORITOS</Text>
        <Text style={styles.subtitle}>{known.length} {known.length === 1 ? "jugador guardado" : "jugadores guardados"}</Text>
      </Reveal>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {known.length > 0 && (
        <Reveal order={1}>
          <View style={styles.filters}>
            <Chip label="Todos" active={filter === "all"} onPress={() => setFilter("all")} />
            {GAMES.map(g => (
              <Chip key={g.id} label={`${g.icon} ${g.short}`} active={filter === g.id} game={g.id} onPress={() => setFilter(g.id)} />
            ))}
          </View>
        </Reveal>
      )}

      {known.length === 0 ? (
        <Reveal order={1}>
          <EmptyState
            icon="⭐"
            title="Aún no tienes favoritos"
            text="Abre el perfil de un jugador y toca la estrella para guardarlo aquí."
            actionLabel="Buscar un jugador"
            onAction={() => navigation.navigate("Inicio")}
          />
        </Reveal>
      ) : visible.length === 0 ? (
        <EmptyState compact icon="🔎" title="Sin favoritos de este juego" />
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
