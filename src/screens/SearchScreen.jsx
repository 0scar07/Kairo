import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet, Platform, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useT } from "../i18n/I18nProvider";
import { GAMES, getGame } from "../games";
import { getRegion } from "../constants/regions";
import { RegionChips } from "../components/RegionPicker";
import { Chip, PressableScale, SectionLabel } from "../components/ui";
import GameLogo from "../components/GameLogo";
import Icon from "../components/Icon";
import { useBootData } from "../boot/BootContext";
import { loadPlatforms, savePlatform } from "../utils/prefs";
import { loadRecents } from "../utils/recents";
import { profileTarget, searchPlaceholder, searchTarget } from "../utils/target";
import { select, warning } from "../utils/haptics";
import { colors, radii, sizes, spacing, fontSizes, type, useActiveGame, withAlpha } from "../theme";

/**
 * Buscar desde cualquier pestaña (botón circular de la barra inferior). Se abre como modal: en iOS es una hoja que se
 * cierra deslizando hacia abajo; en Android, una pantalla que sube. El campo va arriba para que el teclado nunca lo tape.
 * Usa la misma lógica que el buscador de Inicio (utils/target.js).
 */
export default function SearchScreen({ navigation }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { gameId, accent, setGameId } = useActiveGame();
  const { region, setRegion, gameEnabled } = useBootData();
  const game = getGame(gameId) || GAMES[0];
  const [input, setInput] = useState("");
  const [error, setError] = useState(null);
  const [platforms, setPlatforms] = useState({});
  const [recents, setRecents] = useState([]);
  const inputRef = useRef(null);
  const platform = game.platforms ? (platforms[game.id] || game.platforms[0].id) : null;

  useEffect(() => {
    loadPlatforms().then(setPlatforms);
    loadRecents().then(setRecents).catch(e => console.warn("No se pudieron leer las búsquedas recientes:", e.message));
    // En Android el modal termina de subir antes de que el campo pueda recibir el foco
    const id = setTimeout(() => inputRef.current?.focus(), Platform.OS === "android" ? 300 : 50);
    return () => clearTimeout(id);
  }, []);
  useEffect(() => { setInput(""); setError(null); }, [game.id]);   // lo escrito para un juego no vale para otro

  function open(screen, params) {
    navigation.goBack();
    navigation.navigate(screen, params);
  }

  function submit() {
    setError(null);
    const result = searchTarget(game, input, { region, platform });
    if (result.error) { warning(); setError(result.error); return; }
    open(result.screen, result.params);
  }

  function changePlatform(id) {
    setPlatforms(prev => ({ ...prev, [game.id]: id }));
    savePlatform(game.id, id).catch(e => console.warn("No se pudo guardar la plataforma:", e.message));
  }

  const shownRecents = recents.filter(r => getGame(r.gameId));

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === "ios" ? spacing.sm : insets.top + spacing.sm }]}>
      {Platform.OS === "ios" ? <View style={styles.grabber} /> : null}
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">{t("tabs.search")}</Text>
        <Pressable onPress={() => navigation.goBack()} hitSlop={spacing.md} accessibilityRole="button" style={styles.cancel}>
          <Text style={styles.cancelText}>{t("common.cancel")}</Text>
        </Pressable>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        {/* Juego en el que se busca (es el mismo juego activo de Inicio) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.games} contentContainerStyle={styles.gamesRow}>
          {GAMES.filter(g => gameEnabled(g.id)).map(g => (
            <Chip
              key={g.id}
              label={g.short}
              game={g.id}
              active={g.id === game.id}
              icon={<GameLogo game={g.id} size={sizes.avatarXs} color={g.id === game.id ? g.accent : colors.textMuted} muted={g.id !== game.id} />}
              onPress={() => { if (g.id !== game.id) setGameId(g.id); }}
            />
          ))}
        </ScrollView>

        <SectionLabel>{t("home.searchIn", { game: game.name })}</SectionLabel>
        <View style={[styles.field, error && styles.fieldError]}>
          <Icon name="search" size={fontSizes.lg} color={colors.textMuted} />
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={v => { setInput(v); if (error) setError(null); }}
            onSubmitEditing={submit}
            placeholder={searchPlaceholder(game)}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={t("home.searchIn", { game: game.name })}
            accessibilityHint={error || undefined}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {input ? (
            <PressableScale onPress={() => { setInput(""); setError(null); }} scaleTo={0.85} hitSlop={spacing.sm} style={styles.clear} accessibilityLabel={t("home.clearInput")}>
              <Icon name="close" size={fontSizes.sm} color={colors.bg} strokeWidth={3} />
            </PressableScale>
          ) : null}
        </View>
        {error ? (
          <View style={styles.errorRow} accessibilityLiveRegion="polite">
            <Icon name="alert" size={fontSizes.md} color={colors.loss} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {game.hasRegion === false
          ? (game.platforms ? <View style={styles.regions}><RegionChips value={platform} onChange={changePlatform} options={game.platforms} game={game.id} /></View> : null)
          : <View style={styles.regions}><RegionChips value={region} onChange={setRegion} game={game.id} /></View>}

        <PressableScale haptic onPress={submit} scaleTo={0.97} style={[styles.go, { backgroundColor: accent }]} accessibilityLabel={t("home.searchIn", { game: game.name })}>
          <Icon name="search" size={fontSizes.lg} color={colors.onAccent} />
          <Text style={styles.goText}>{t("tabs.search")}</Text>
        </PressableScale>

        {shownRecents.length > 0 ? (
          <>
            <SectionLabel style={styles.recentsLabel}>{t("home.recents")}</SectionLabel>
            {shownRecents.map(r => (
              <Pressable
                key={`${r.gameId}-${r.region}-${r.gameName}-${r.tagLine}`}
                onPress={() => { select(); open("Profile", profileTarget(r)); }}
                style={({ pressed }) => [styles.recent, pressed && styles.recentPressed]}
                accessibilityRole="button"
              >
                <GameLogo game={r.gameId} size={sizes.item} color={getGame(r.gameId).accent} />
                <View style={styles.recentText}>
                  <Text style={styles.recentName} numberOfLines={1}>{r.gameName}{r.tagLine ? <Text style={styles.recentTag}> #{r.tagLine}</Text> : null}</Text>
                  <Text style={styles.recentMeta} numberOfLines={1}>{getGame(r.gameId).name}{getGame(r.gameId).hasRegion === false ? "" : ` · ${getRegion(r.region).label}`}</Text>
                </View>
                <Icon name="chevron" size={fontSizes.lg} color={colors.textMuted} />
              </Pressable>
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.bg },
  grabber:      { alignSelf: "center", width: spacing.xxxl - spacing.md, height: spacing.xs + 1, borderRadius: radii.pill, backgroundColor: colors.borderStrong, marginBottom: spacing.sm },
  header:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  title:        { ...type.largeTitle, fontSize: fontSizes.xxxl, color: colors.text },
  cancel:       { minHeight: sizes.placement, justifyContent: "center" },
  cancelText:   { ...type.bodyStrong, fontSize: fontSizes.base, color: colors.textSecondary },
  content:      { paddingHorizontal: spacing.xl },
  games:        { marginHorizontal: -spacing.xl, marginBottom: spacing.lg },
  gamesRow:     { paddingHorizontal: spacing.xl },
  field:        {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.surface, borderWidth: sizes.hairline, borderColor: colors.border,
    borderRadius: radii.md, paddingHorizontal: spacing.md,
  },
  fieldError:   { borderColor: withAlpha(colors.loss, 0.6) },
  input:        { ...type.body, flex: 1, minWidth: 0, paddingVertical: spacing.md, color: colors.text, ...(Platform.OS === "web" ? { outlineStyle: "none" } : null) },
  clear:        { width: sizes.avatarXs, height: sizes.avatarXs, borderRadius: radii.pill, backgroundColor: colors.textMuted, alignItems: "center", justifyContent: "center" },
  errorRow:     { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginTop: spacing.sm },
  errorText:    { ...type.small, color: colors.text, flex: 1 },
  regions:      { marginTop: spacing.md },
  go:           { flexDirection: "row", gap: spacing.sm, alignItems: "center", justifyContent: "center", minHeight: sizes.button, borderRadius: radii.md },
  goText:       { ...type.heading, color: colors.onAccent },
  recentsLabel: { marginTop: spacing.xl },
  recent:       { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: sizes.placement + spacing.md, paddingHorizontal: spacing.sm, borderRadius: radii.md },
  recentPressed:{ backgroundColor: colors.surface },
  recentText:   { flex: 1, minWidth: 0 },
  recentName:   { ...type.bodyStrong, fontSize: fontSizes.base, color: colors.text },
  recentTag:    { color: colors.textMuted },
  recentMeta:   { ...type.caption, color: colors.textMuted },
});
