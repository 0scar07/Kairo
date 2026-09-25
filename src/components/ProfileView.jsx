import React, { useEffect, useState } from "react";
import { useT } from "../i18n/I18nProvider";
import { ScrollView, StyleSheet, RefreshControl } from "react-native";
import Reveal from "./Reveal";
import { ErrorBanner, ProfileHeader } from "./ui";
import { getGame } from "../games";
import RankEmblem from "./RankEmblem";
import { errorMessage, tierLabel } from "../utils/format";
import Icon from "./Icon";
import { isFavoriteIn, loadFavorites, refreshFavorite, toggleFavorite } from "../utils/favorites";
import { success } from "../utils/haptics";
import { colors, sizes, spacing, useAccent } from "../theme";

/**
 * Perfil genérico: cabecera, favorito, refresco y errores. El contenido propio de cada juego
 * (partidas, rangos, estadísticas) lo pinta `game.ProfileBody`, así que esta vista no conoce ningún juego.
 *
 *  - gameId, initialData: qué juego y datos iniciales (los que devolvió game.api.search)
 *  - mine: perfil propio (el juego puede mostrar extras); headerAction sustituye a la estrella de favorito
 */
export default function ProfileView({ gameId, initialData, mine, headerAction, bottomSpace = spacing.xxxl }) {
  const t = useT();
  const game = getGame(gameId);
  const accent = useAccent(gameId);
  const [data, setData] = useState(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isFav, setIsFav] = useState(false);

  const { account, region } = data;
  const profile = game.getProfile(data);

  useEffect(() => {
    const me = { ...game.toFavorite(data), gameId, region };
    loadFavorites()
      .then(list => {
        const saved = isFavoriteIn(list, me);
        setIsFav(saved);
        // Si ya es favorito, se actualiza con los datos de hoy (PUUID nuevo si cambió la key, ícono, rango)
        if (saved) return refreshFavorite(me);
      })
      .catch(e => console.warn("No se pudieron leer los favoritos:", e.message));
  }, [gameId, account.puuid]);

  async function onToggleFavorite() {
    try {
      const { isFav: marked } = await toggleFavorite({ ...game.toFavorite(data), gameId, region });
      setIsFav(marked);
      if (marked) success();
    } catch (e) {
      setError(t("profile.favoriteError", { error: errorMessage(e) }));
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      setData(await game.api.search(account.lookup ?? account.gameName, account.tagLine, region));
    } catch (e) {
      setError(t("profile.refreshError", { error: errorMessage(e) }));
    }
    setRefreshing(false);
  }

  const ranked = profile.ranked;
  const badge = ranked ? tierLabel(ranked.tier, ranked.rank) : profile.badge || null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: bottomSpace }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
    >
      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <Reveal order={0}>
        <ProfileHeader
          game={gameId}
          avatar={profile.avatar}
          name={profile.name}
          tag={profile.tag}
          subtitle={profile.subtitle}
          badge={badge}
          badgeIcon={ranked ? <RankEmblem tier={ranked.tier} size={sizes.item} /> : profile.badgeIcon || null}
          glowColor={colors.tier[ranked?.tier]}
          action={headerAction ? headerAction.icon : (
            <Icon name="star" size={sizes.avatarSm} color={isFav ? colors.gold : colors.textMuted} filled={isFav} />
          )}
          onAction={headerAction ? headerAction.onPress : onToggleFavorite}
        />
      </Reveal>

      <game.ProfileBody data={data} setData={setData} setError={setError} mine={mine} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content:   { padding: spacing.lg },
});
