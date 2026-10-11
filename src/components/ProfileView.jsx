import React, { useEffect, useRef, useState } from "react";
import { useT } from "../i18n/I18nProvider";
import { ScrollView, StyleSheet, RefreshControl, Text } from "react-native";
import Reveal from "./Reveal";
import { ErrorBanner, Notice, ProfileHeader } from "./ui";
import { activeLanguage } from "../i18n";
import { getGame } from "../games";
import RankEmblem from "./RankEmblem";
import { errorMessage, tierLabel } from "../utils/format";
import Icon from "./Icon";
import FavoriteStar from "./FavoriteStar";
import { canAlert, hasAlerts, isFavoriteIn, loadFavorites, refreshFavorite, sameFavorite, toggleFavorite } from "../utils/favorites";
import BellButton from "../notifications/BellButton";
import ShareButton from "../share/ShareButton";
import { useNavigation } from "@react-navigation/native";
import { PressableScale, showHud } from "./ui";
import { useNotifications } from "../notifications/NotificationsProvider";
import { success, tap, warning } from "../utils/haptics";
import { colors, sizes, spacing, type, useAccent } from "../theme";

/**
 * Perfil genérico: cabecera, favorito, refresco y errores. El contenido propio de cada juego
 * (partidas, rangos, estadísticas) lo pinta `game.ProfileBody`, así que esta vista no conoce ningún juego.
 *
 *  - gameId, initialData: qué juego y datos iniciales (los que devolvió game.api.search)
 *  - mine: perfil propio (el juego puede mostrar extras); headerAction sustituye a la estrella de favorito
 */
export default function ProfileView({ gameId, initialData, mine, headerAction, offlineAt, bottomSpace = spacing.xxxl }) {
  const t = useT();
  const navigation = useNavigation();
  const game = getGame(gameId);
  const accent = useAccent(gameId);
  const [data, setData] = useState(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isFav, setIsFav] = useState(false);
  const [offline, setOffline] = useState(offlineAt || null);   // fecha de la copia local que se está mostrando sin conexión
  const [alerts, setAlerts] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(() => (offlineAt ? new Date(offlineAt).getTime() : Date.now()));
  const [, setTick] = useState(0);   // vuelve a pintar "hace X min" cada 30 s
  useEffect(() => { const id = setInterval(() => setTick(n => n + 1), 30000); return () => clearInterval(id); }, []);
  const { supported, toggleAlerts, favoritesVersion } = useNotifications();

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

  // Estado de la campanita: sigue a los favoritos guardados (también cuando la hoja de permiso termina)
  const me = { ...game.toFavorite(data), gameId, region };
  const showBell = supported && isFav && !headerAction && canAlert(me);
  useEffect(() => {
    if (!showBell) return;
    loadFavorites()
      .then(list => setAlerts(hasAlerts(list.find(f => sameFavorite(f, me)))))
      .catch(e => console.warn("No se pudieron leer las alertas:", e.message));
  }, [showBell, favoritesVersion, account.puuid]);

  async function onToggleFavorite() {
    try {
      const { isFav: marked } = await toggleFavorite({ ...game.toFavorite(data), gameId, region });
      setIsFav(marked);
      if (marked) success();
      showHud(t(marked ? "hud.added" : "hud.removed"), marked ? "star" : "check");
    } catch (e) {
      setError(t("profile.favoriteError", { error: errorMessage(e) }));
    }
  }

  async function onRefresh() {
    tap();
    setRefreshing(true);
    setError(null);
    try {
      setData(await game.api.search(account.lookup ?? account.gameName, account.tagLine, region));
      setOffline(null);
      setUpdatedAt(Date.now());
      success();
    } catch (e) {
      warning();
      setError(t("profile.refreshError", { error: errorMessage(e) }));
    }
    setRefreshing(false);
  }

  // Al pasar la cabecera, el nombre del jugador sube a la barra de navegación (como en iOS)
  const nameInBar = useRef(false);
  function onScroll(e) {
    const show = e.nativeEvent.contentOffset.y > 110;
    if (show === nameInBar.current) return;
    nameInBar.current = show;
    navigation.setOptions({ headerTitle: show ? profile.name : undefined });
  }

  const ranked = profile.ranked;
  const badge = ranked ? tierLabel(ranked.tier, ranked.rank) : profile.badge || null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: bottomSpace }]}
      onScroll={onScroll}
      scrollEventThrottle={32}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
    >
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      {offline ? <Notice tone="warn" icon="alert">{t("offline.notice", { date: new Date(offline).toLocaleString(activeLanguage(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) })}</Notice> : null}

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
            <FavoriteStar active={isFav} size={sizes.avatarSm} />
          )}
          onAction={headerAction ? headerAction.onPress : onToggleFavorite}
          extraAction={(
            <>
              <ShareButton gameId={gameId} data={data} accent={accent} />
              {game.compare ? (
                <PressableScale
                  haptic scaleTo={0.85} hitSlop={spacing.sm} style={styles.iconButton}
                  accessibilityRole="button" accessibilityLabel={t("compare.button")}
                  onPress={() => navigation.navigate("Compare", { a: { gameName: account.gameName, tagLine: account.tagLine, region } })}
                >
                  <Icon name="compare" size={sizes.item - spacing.xs} color={colors.textMuted} />
                </PressableScale>
              ) : null}
              {showBell ? <BellButton active={alerts} accent={accent} onPress={() => toggleAlerts({ ...me, alerts })} /> : null}
            </>
          )}
        />
        <Text style={styles.updated} accessibilityLiveRegion="polite">{t("profile.updated", { time: relativeTime(updatedAt) })}</Text>
      </Reveal>

      <game.ProfileBody data={data} setData={setData} setError={setError} mine={mine} />
    </ScrollView>
  );
}

// "ahora", "hace 3 minutos", "hace 2 horas"… en el idioma de la app
// Hermes (Android) puede no traer Intl.RelativeTimeFormat: entonces se usa un formato compacto ("3 min").
function relativeTime(ts) {
  const secs = Math.round((ts - Date.now()) / 1000);
  if (typeof Intl === "undefined" || typeof Intl.RelativeTimeFormat !== "function") {
    const s = -secs;
    if (s < 60) return "< 1 min";
    if (s < 3600) return `${Math.round(s / 60)} min`;
    if (s < 86400) return `${Math.round(s / 3600)} h`;
    return `${Math.round(s / 86400)} d`;
  }
  const rtf = new Intl.RelativeTimeFormat(activeLanguage(), { numeric: "auto" });
  if (secs > -45) return rtf.format(0, "second");
  if (secs > -3600) return rtf.format(Math.round(secs / 60), "minute");
  if (secs > -86400) return rtf.format(Math.round(secs / 3600), "hour");
  return rtf.format(Math.round(secs / 86400), "day");
}

const styles = StyleSheet.create({
  updated:   { ...type.caption, color: colors.textMuted, textAlign: "center", marginTop: -spacing.sm, marginBottom: spacing.md },
  iconButton: { padding: spacing.xs + spacing.xxs },
  container: { flex: 1, backgroundColor: colors.bg },
  content:   { padding: spacing.lg },
});
