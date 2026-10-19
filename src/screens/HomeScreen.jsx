import React, { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "../i18n/I18nProvider";
import { View, Text, TextInput, ScrollView, StyleSheet, Alert, TouchableOpacity, Platform, RefreshControl, Image } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { GAMES, UPCOMING_GAMES, getGame } from "../games";
import { regionName } from "../constants/regions";
import { errorMessage } from "../utils/format";
import { profileTarget, searchPlaceholder, searchTarget } from "../utils/target";
import { loadPlatforms, savePlatform } from "../utils/prefs";
import { loadFavorites, removeFavorite } from "../utils/favorites";
import { loadRecents, clearRecents, removeRecent } from "../utils/recents";
import { select, warning, tap, success } from "../utils/haptics";
import { Card, SectionLabel, PressableScale, EmptyState, showHud, Sheet, SheetAction } from "../components/ui";
import { RegionButton } from "../components/RegionPicker";
import FavoriteCard from "../components/FavoriteCard";
import SuggestedPlayers from "../components/SuggestedPlayers";
import Icon from "../components/Icon";
import Reveal from "../components/Reveal";
import Animated, { FadeIn, FadeOut, ReduceMotion, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";
import { CompactTitleBar, useLargeTitle } from "../components/LargeTitle";
import { APP_NAME } from "../constants/config";
import GameLogo from "../components/GameLogo";
import { useBootData } from "../boot/BootContext";
import { homeArtFor } from "../utils/homeArt";
import { getRotation } from "../games/lol/api";
import {
  colors, radii, sizes, spacing, fontSizes, lineHeights, type, tracking, textGlow, withAlpha, useActiveGame,
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
  const inputRef = useRef(null);
  const [recents,   setRecents]   = useState(bootRecents);
  const [platforms, setPlatforms] = useState({});   // plataforma elegida por juego (Fortnite, Apex, PUBG…)
  const [error,     setError]     = useState(null); // formato incorrecto: se muestra bajo el buscador, sin alertas
  const { y, onScroll } = useLargeTitle();
  const [focused, setFocused] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [recentMenu, setRecentMenu] = useState(null);   // búsqueda reciente con el menú contextual abierto
  const [extrasKey, setExtrasKey] = useState(0);   // al refrescar se vuelven a pedir los extras del juego (estado, rotación)

  // Tirar hacia abajo: vuelve a comprobar el servidor y recarga favoritos, recientes y extras
  async function onRefresh() {
    tap();
    setRefreshing(true);
    await Promise.all([
      retryServer(),
      loadFavorites().then(setFavorites).catch(e => console.warn("No se pudieron leer los favoritos:", e.message)),
      loadRecents().then(setRecents).catch(e => console.warn("No se pudieron leer las búsquedas recientes:", e.message)),
    ]);
    setExtrasKey(k => k + 1);
    setRefreshing(false);
    success();
  }

  const game = getGame(gameId) || GAMES[0];
  const Extras = game.HomeExtras;

  // Arte de fondo del juego activo (ver utils/homeArt.js); cambia al cambiar de juego. Sin arte, el logo del juego.
  const [art, setArt] = useState(null);
  useEffect(() => {
    setArt(null);
    let alive = true;
    homeArtFor(game.id, { region, rotation: getRotation }).then(a => { if (alive) setArt(a); }).catch(() => {});
    return () => { alive = false; };
  }, [game.id, region]);
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
    setError(null);
    const result = searchTarget(game, input, { region, platform });
    if (result.error) { invalid(result.error); return; }
    navigation.navigate(result.screen, result.params);
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

  async function onRemoveRecent(r) {
    setRecents(prev => prev.filter(x => x !== r));
    try {
      await removeRecent(r);
    } catch (e) {
      loadRecents().then(setRecents).catch(err => console.warn("No se pudieron recargar las búsquedas recientes:", err.message));
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
      <Animated.ScrollView
        contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled" onScroll={onScroll} scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} colors={[accent]} progressBackgroundColor={colors.surface} />}
      >
        {art?.uri || art?.source ? <HomeArt key={art.uri || String(art.source)} art={art} /> : null}
        {art?.logo ? <LogoMark key={`logo-${game.id}`} game={game.id} color={game.accent} /> : null}
        {/* Brillo ambiental del juego activo: cambia con un fundido al elegir otro juego */}
        <Animated.View key={game.id} entering={FadeIn.duration(600)} exiting={FadeOut.duration(400)} pointerEvents="none" style={[styles.ambient, (art?.uri || art?.source) && styles.ambientSoft]}>
          <Svg width="100%" height="100%">
            <Defs>
              <RadialGradient id={`amb-${game.id}`} cx="30%" cy="0%" r="75%">
                <Stop offset="0" stopColor={accent} stopOpacity="0.22" />
                <Stop offset="1" stopColor={accent} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#amb-${game.id})`} />
          </Svg>
        </Animated.View>

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
          {/* La marca de la app con el color del juego activo, como en la pantalla de carga */}
          <Text style={[styles.logoText, { color: accent }, textGlow(accent, spacing.lg)]} accessibilityRole="header">{APP_NAME.toUpperCase()}</Text>
          <Text style={styles.logoSub}>{t("app.tagline").toUpperCase()}</Text>
        </Reveal>

        {/* Buscador destacado (no en los juegos sin perfiles de jugador, como Wild Rift) */}
        {!game.browseOnly && <Reveal order={1} baseDelay={HANDOFF_MS}>
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
                ref={inputRef}
                value={input}
                onChangeText={v => { setInput(v); if (error) setError(null); }}
                onSubmitEditing={handleSearch}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                accessibilityLabel={t("home.searchIn", { game: game.name })}
                accessibilityHint={error || undefined}
                placeholder={searchPlaceholder(game)}
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
        </Reveal>}

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
                  style={[styles.gameBtn, { backgroundColor: withAlpha(g.accent, 0.06) }, active && { backgroundColor: withAlpha(g.accent, 0.18), borderColor: g.accent, boxShadow: `0 0 14px ${withAlpha(g.accent, 0.5)}` }]}
                >
                  {/* Cada juego con su color de marca; el elegido, con borde y brillo. El brillo va con boxShadow y no con
                      elevation: en Android la sombra de elevation se ve a través del fondo translúcido como una mancha negra */}
                  <GamePop active={active}><GameLogo game={g.id} style={styles.gameIcon} size={sizes.avatarSm} color={g.accent} brand dim={!active} /></GamePop>
                  <Text style={[styles.gameShort, styles.gameShortOn, active && { color: g.accent }]}>{g.short}</Text>
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
            <Extras key={extrasKey} region={region} />
          </Reveal>
        )}

        {/* Búsquedas recientes */}
        {recents.length > 0 && !game.browseOnly && (
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
                  onLongPress={() => { tap(); setRecentMenu(r); }}
                  delayLongPress={350}
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
        {!game.browseOnly && <Reveal order={5} baseDelay={HANDOFF_MS}>
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
            <>
              {/* Lo de siempre, más un atajo al buscador de arriba y, en LoL, jugadores del ranking para seguir */}
              <EmptyState
                compact
                icon="star"
                title={t("home.noFavorites")}
                text={t("home.noFavoritesText")}
                actionLabel={t("favorites.search")}
                onAction={() => inputRef.current?.focus()}
              />
              {game.id === "lol" ? <SuggestedPlayers region={region} favorites={favorites} onChanged={setFavorites} onOpen={openProfile} /> : null}
            </>
          )}
        </Reveal>}

      </Animated.ScrollView>
      <Sheet visible={!!recentMenu} onClose={() => setRecentMenu(null)} title={recentMenu ? `${recentMenu.gameName}${recentMenu.tagLine ? ` #${recentMenu.tagLine}` : ""}` : ""}>
        <SheetAction
          label={t("favorites.open")}
          icon={<Icon name="search" size={fontSizes.lg} color={colors.text} />}
          onPress={() => { const r = recentMenu; setRecentMenu(null); openProfile(profileTarget(r)); }}
        />
        <SheetAction
          destructive
          label={t("home.removeRecent")}
          icon={<Icon name="close" size={fontSizes.lg} color={colors.loss} />}
          onPress={() => { const r = recentMenu; setRecentMenu(null); onRemoveRecent(r); }}
        />
      </Sheet>
      <CompactTitleBar y={y} title={APP_NAME} />
    </View>
  );
}

// Arte sutil de fondo: solo arriba, oscurecido y fundido hacia el fondo para que el buscador y las tarjetas no pierdan
// contraste. Entra con un fundido (también con "Reducir movimiento": es solo opacidad).
function HomeArt({ art }) {
  const [uri, setUri] = useState(art.uri);
  const source = art.source || { uri };
  const shown = useSharedValue(0);
  const fade = useAnimatedStyle(() => ({ opacity: shown.value }));
  const onLoad = () => { shown.value = withTiming(1, { duration: 400, reduceMotion: ReduceMotion.Never }); };
  return (
    <Animated.View pointerEvents="none" style={[styles.art, fade]}>
      {/* Igual en todos los juegos: la ilustración a lo ancho, o el personaje grande a la derecha; encima, el mismo
          degradado que la funde con el fondo. Los "vivos" (Wild Rift y Valorant) se ven más; el agente de Valorant
          lleva detrás un brillo con el color del juego. */}
      {art.glow ? (
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <RadialGradient id="homeGlow" cx="78%" cy="30%" r="55%">
              <Stop offset="0" stopColor={art.glow} stopOpacity="0.5" />
              <Stop offset="1" stopColor={art.glow} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#homeGlow)" />
        </Svg>
      ) : null}
      <Image
        source={source}
        style={art.fit === "agent" ? styles.artAgent : art.fit === "hero" ? styles.artHero : [StyleSheet.absoluteFill, styles.artImage, art.vivid && styles.artVivid]}
        resizeMode={art.fit === "hero" || art.fit === "agent" ? "contain" : "cover"}
        onLoad={onLoad}
        onError={() => { if (art.fallback && uri !== art.fallback) setUri(art.fallback); }}
        accessibilityIgnoresInvertColors
      />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="homeShade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.bg} stopOpacity={art.vivid ? "0.2" : "0.45"} />
            <Stop offset="0.5" stopColor={colors.bg} stopOpacity={art.vivid ? "0.62" : "0.75"} />
            <Stop offset="1" stopColor={colors.bg} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#homeShade)" />
      </Svg>
    </Animated.View>
  );
}

// Juegos sin arte: su logo grande, muy tenue, arriba a la derecha
function LogoMark({ game, color }) {
  return (
    <Animated.View entering={FadeIn.duration(400).reduceMotion(ReduceMotion.Never)} pointerEvents="none" style={styles.logoMark}>
      <GameLogo game={game} size={sizes.iconHero * 2.2} color={color} />
    </Animated.View>
  );
}

// El logo del juego recién elegido da un pequeño salto
function GamePop({ active, children }) {
  const s = useSharedValue(1);
  useEffect(() => {
    if (active) s.value = withSequence(withSpring(1.2, { damping: 9, stiffness: 380 }), withSpring(1, { damping: 12, stiffness: 240 }));
  }, [active]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.bg },
  ambient:       { position: "absolute", top: 0, left: 0, right: 0, height: sizes.iconHero * 4 },
  ambientSoft:   { opacity: 0.5 },
  // overflow: el fondo desenfocado va ampliado y no debe salirse por debajo del degradado que lo funde con el fondo
  art:           { position: "absolute", top: 0, left: 0, right: 0, height: sizes.iconHero * 4 + spacing.xxxl, overflow: "hidden" },
  artImage:      { opacity: 0.6 },
  artVivid:      { opacity: 0.8 },
  artAgent:      { position: "absolute", top: spacing.xl, bottom: 0, right: -spacing.xxxl, width: "88%" },
  artHero:       { position: "absolute", top: 0, bottom: 0, right: -spacing.xl, width: "70%", opacity: 0.75 },
  logoMark:      { position: "absolute", top: spacing.xxxl, right: -spacing.xxl, opacity: 0.08, transform: [{ rotate: "-12deg" }] },
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
  gameShortOn:   { color: colors.textSecondary },
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
