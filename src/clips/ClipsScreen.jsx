import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Image, FlatList, Linking, Pressable, Share, StyleSheet, useWindowDimensions } from "react-native";
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import Svg, { Path } from "react-native-svg";
import { ErrorState, PressableScale, showHud } from "../components/ui";
import Icon from "../components/Icon";
import GameLogo from "../components/GameLogo";
import { getGameMeta } from "../games/registry";
import { GoldSkeleton } from "../news/fx";
import { loadMyList, toggleMyList } from "../news/storage";
import YouTubePlayer from "./YouTubePlayer";
import { clipAsItem, getClips, hasWebView, loadSound, saveSound } from "./api";
import { useT } from "../i18n/I18nProvider";
import { errorMessage, formatCompact, timeSince } from "../utils/format";
import { select, success, tap } from "../utils/haptics";
import { colors, fontSizes, radii, sizes, spacing, type, withAlpha } from "../theme";

const DOUBLE_MS = 260;

/** Marcador de Mi lista */
const Mark = ({ filled, size = fontSizes.xl }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M6 3h12v18l-6-4-6 4z" stroke="#F3D58A" strokeWidth={2} strokeLinejoin="round" fill={filled ? "#F3D58A" : "none"} /></Svg>
);

/** Fondo de vidrio detrás de un botón (en la web el desenfoque taparía el ícono si no va por debajo) */
const Frost = ({ intensity = 30 }) => <BlurView intensity={intensity} tint="dark" style={[StyleSheet.absoluteFill, styles.frost]} pointerEvents="none" />;

/** Botón redondo de vidrio de la columna derecha */
function SideButton({ children, label, onPress, active }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.88} haptic style={styles.sideBtn} accessibilityRole="button" accessibilityLabel={label}>
      <View style={[styles.sideCircle, active && styles.sideActive]}>
        <Frost />
        <View style={styles.above}>{children}</View>
      </View>
      <Text style={styles.sideText} numberOfLines={1}>{label}</Text>
    </PressableScale>
  );
}

/** Un clip a pantalla completa: portada, reproductor (si es el activo), gestos y su información */
function Clip({ clip, active, height, muted, saved, canPlay, onToggleSave, onToggleMute, insetsBottom, muteTop }) {
  const t = useT();
  const reduce = useReducedMotion();
  const meta = getGameMeta(clip.game);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [image, setImage] = useState(clip.image);
  const progress = useSharedValue(0);
  const burst = useSharedValue(0);
  const lastTap = useRef(0);
  const single = useRef(null);

  useEffect(() => { if (!active) { setPaused(false); setReady(false); progress.value = 0; } }, [active]);

  const onEvent = useCallback(e => {
    if (e.t === "ready") setReady(true);
    if (e.t === "time" && e.d) progress.value = withTiming(Math.min(1, e.c / e.d), { duration: 250 });
  }, []);

  // Un toque pausa o sigue; dos toques seguidos guardan en Mi lista con una animación del marcador
  function onPress() {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_MS) {
      clearTimeout(single.current);
      lastTap.current = 0;
      if (!saved) onToggleSave();
      if (!reduce) burst.value = withSequence(withSpring(1, { damping: 8, stiffness: 260 }), withDelay(450, withTiming(0, { duration: 300 })));
      return;
    }
    lastTap.current = now;
    single.current = setTimeout(() => {
      if (!canPlay) { Linking.openURL(clip.url); return; }
      tap();
      setPaused(p => !p);
    }, DOUBLE_MS);
  }

  const bar = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  const burstStyle = useAnimatedStyle(() => ({ opacity: burst.value, transform: [{ scale: 0.5 + burst.value * 0.7 }, { translateY: (1 - burst.value) * spacing.xl }] }));
  const fresh = clip.date && Date.now() - new Date(clip.date).getTime() < 48 * 60 * 60 * 1000;

  return (
    <View style={[styles.clip, { height }]}>
      <Pressable onPress={onPress} style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={clip.title} accessibilityHint={t("clips.tapHint")}>
        {image ? <Image source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => { if (image !== clip.fallback) setImage(clip.fallback); }} /> : null}
        {active && canPlay ? <YouTubePlayer videoId={clip.id} playing={!paused} muted={muted} onEvent={onEvent} /> : null}
        {/* La portada tapa el reproductor hasta que el video arranca (sin pantallazo negro) */}
        {active && canPlay && !ready ? (
          <Animated.View exiting={FadeOut.duration(250)} style={StyleSheet.absoluteFill} pointerEvents="none">
            {image ? <Image source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
          </Animated.View>
        ) : null}
        <View style={styles.shadeTop} pointerEvents="none" />
        <View style={styles.shadeBottom} pointerEvents="none" />
        {paused || !canPlay ? (
          <Animated.View entering={FadeIn.duration(160)} style={styles.center} pointerEvents="none">
            <View style={styles.bigPlay}><Text style={styles.bigPlayText}>▶</Text></View>
            {!canPlay ? <Text style={styles.openYt}>{t("clips.openYoutube")}</Text> : null}
          </Animated.View>
        ) : null}
        <Animated.View style={[styles.center, burstStyle]} pointerEvents="none"><Mark filled size={sizes.iconHero} /></Animated.View>
      </Pressable>

      {active && canPlay ? (
        <PressableScale onPress={onToggleMute} scaleTo={0.92} haptic style={[styles.mute, { top: muteTop }]} accessibilityRole="button" accessibilityLabel={muted ? t("clips.soundOn") : t("clips.soundOff")}>
          <Frost />
          <Text style={[styles.muteText, styles.above]}>{muted ? `🔇  ${t("clips.tapSound")}` : `🔊  ${t("clips.soundOnLabel")}`}</Text>
        </PressableScale>
      ) : null}

      <View style={[styles.side, { bottom: sizes.chart * 1.15 + insetsBottom }]} pointerEvents="box-none">
        <View style={[styles.avatar, { backgroundColor: meta?.accent || colors.text }]}><GameLogo game={clip.game} size={sizes.item} color={colors.onAccent} /></View>
        <SideButton label={t("clips.myList")} onPress={onToggleSave} active={saved}><Mark filled={saved} /></SideButton>
        <SideButton label={t("news.share")} onPress={() => Share.share({ message: `${clip.title}\n${clip.url}` }).catch(() => {})}><Icon name="share" size={fontSizes.xl} color={colors.text} /></SideButton>
        <SideButton label="YouTube" onPress={() => Linking.openURL(clip.url)}><Text style={styles.ytText}>▶</Text></SideButton>
      </View>

      <View style={[styles.info, { bottom: spacing.xxxl + insetsBottom }]} pointerEvents="none">
        <View style={styles.channelRow}>
          <Text style={styles.channel} numberOfLines={1}>@{clip.channel.replace(/[\s:]+/g, "")}</Text>
          <Text style={styles.official}>{t("clips.official")}</Text>
        </View>
        <Text style={styles.title} numberOfLines={3}>{clip.title}</Text>
        <Text style={styles.meta}>
          {[clip.views != null ? `👁 ${formatCompact(clip.views)}` : null, clip.likes != null ? `♥ ${formatCompact(clip.likes)}` : null, clip.date ? timeSince(new Date(clip.date).getTime()) : null].filter(Boolean).join("   ")}
        </Text>
        <View style={styles.tagRow}>
          <View style={[styles.gameTag, { backgroundColor: withAlpha(meta?.accent || colors.text, 0.92) }]}><Text style={styles.gameTagText}>{(meta?.name || clip.game).toUpperCase()}{clip.esports ? ` · ${t("clips.esports").toUpperCase()}` : ""}</Text></View>
          {fresh ? <View style={styles.newTag}><Text style={styles.newText}>{t("news.new").toUpperCase()}</Text></View> : null}
        </View>
      </View>

      <View style={[styles.track, { bottom: spacing.xl + insetsBottom }]} pointerEvents="none"><Animated.View style={[styles.fill, bar]} /></View>
    </View>
  );
}

/**
 * Visor de Clips a pantalla completa, tipo TikTok: un Short oficial por pantalla; deslizar hacia arriba pasa al
 * siguiente y arranca solo (el anterior se pausa). Arriba, "Para ti" / "Esports" y el filtro por juego.
 *  - params: { startId?, game? }
 */
export default function ClipsScreen({ route, navigation }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [state, setState] = useState({ status: "loading" });
  const [game, setGame] = useState(route.params?.game || "all");
  const [feed, setFeed] = useState("foryou");
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [myList, setMyList] = useState([]);
  const [attempt, setAttempt] = useState(0);
  const listRef = useRef(null);
  const canPlay = hasWebView();

  useEffect(() => {
    let alive = true;
    getClips(attempt > 0).then(items => { if (alive) setState({ status: "ready", items }); }).catch(e => { if (alive) setState({ status: "error", message: errorMessage(e) }); });
    return () => { alive = false; };
  }, [attempt]);
  useEffect(() => { loadSound().then(on => setMuted(!on)); loadMyList().then(setMyList); }, []);

  const all = state.items || [];
  const list = useMemo(() => all.filter(c => (game === "all" || c.game === game) && (feed === "foryou" || c.esports)), [all, game, feed]);
  const games = useMemo(() => [...new Set(all.map(c => c.game))], [all]);

  // Al abrir desde una portada se empieza por ese clip
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !list.length) return;
    started.current = true;
    const i = route.params?.startId ? list.findIndex(c => c.id === route.params.startId) : 0;
    if (i > 0) setTimeout(() => { listRef.current?.scrollToIndex({ index: i, animated: false }); setIndex(i); }, 0);
  }, [list.length]);
  useEffect(() => { setIndex(0); listRef.current?.scrollToOffset?.({ offset: 0, animated: false }); }, [game, feed]);

  const onViewable = useRef(({ viewableItems }) => {
    const v = viewableItems.find(x => x.isViewable);
    if (v && v.index != null) setIndex(prev => { if (prev !== v.index) select(); return v.index; });
  }).current;

  async function toggleSave(clip) {
    const { list: next, saved } = await toggleMyList(clipAsItem(clip));
    setMyList(next);
    success();
    showHud(saved ? t("news.savedToast") : t("news.removedToast"), saved ? "check" : "close");
  }
  function toggleMute() { setMuted(m => { saveSound(m); return !m; }); }

  const close = (
    <PressableScale onPress={() => navigation.goBack()} hitSlop={spacing.sm} style={styles.round} accessibilityRole="button" accessibilityLabel={t("news.back")}>
      <Frost />
      <View style={styles.above}><Icon name="close" size={fontSizes.lg} color={colors.text} /></View>
    </PressableScale>
  );

  if (state.status !== "ready") {
    return (
      <View style={[styles.container, styles.middle]}>
        {state.status === "error" ? <ErrorState message={state.message} onRetry={() => setAttempt(n => n + 1)} /> : <GoldSkeleton height={height * 0.7} width="88%" radius={radii.xl} />}
        <View style={[styles.top, { top: insets.top + spacing.sm }]}>{close}</View>
      </View>
    );
  }

  const dots = list.length > 1 ? Array.from({ length: Math.min(5, list.length) }, (_, k) => Math.max(0, Math.min(list.length - 5, index - 2)) + k) : [];
  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={list}
        keyExtractor={c => c.id}
        renderItem={({ item, index: i }) => (
          <Clip
            clip={item} active={i === index} height={height} muted={muted} canPlay={canPlay} insetsBottom={insets.bottom}
            muteTop={insets.top + spacing.sm + (sizes.avatarLg + spacing.sm) * 2}
            saved={myList.some(s => s.id === `clip:${item.id}`)} onToggleSave={() => toggleSave(item)} onToggleMute={toggleMute}
          />
        )}
        pagingEnabled
        snapToInterval={height}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 70 }}
        windowSize={3}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        removeClippedSubviews
        ListEmptyComponent={<View style={[styles.middle, { height }]}><Text style={styles.empty}>{t("clips.empty")}</Text></View>}
      />

      {/* Barra de arriba: cerrar, Para ti / Esports y el filtro por juego */}
      <View style={[styles.top, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
        {close}
        <View style={styles.seg}>
          {[["foryou", t("clips.forYou")], ["esports", t("clips.esports")]].map(([k, label]) => (
            <Pressable key={k} onPress={() => { select(); setFeed(k); }} accessibilityRole="tab" accessibilityState={{ selected: feed === k }}>
              <Text style={[styles.segText, feed === k && styles.segOn]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.roundSpacer} />
      </View>
      <View style={[styles.chips, { top: insets.top + spacing.sm + sizes.avatarLg + spacing.sm }]} pointerEvents="box-none">
        {["all", ...games].map(g => {
          const on = g === game;
          return (
            <Pressable key={g} onPress={() => { select(); setGame(g); }} style={[styles.chip, on && styles.chipOn]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
              {!on ? <Frost intensity={25} /> : null}
              <Text style={[styles.chipText, on && styles.chipTextOn, styles.above]}>{g === "all" ? t("news.all") : getGameMeta(g)?.short || g}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Por cuál clip vas */}
      <View style={styles.dots} pointerEvents="none">
        {dots.map(k => <View key={k} style={[styles.dot, k === index && styles.dotOn]} />)}
      </View>
      {index === 0 && list.length > 1 ? <Text style={[styles.hint, { bottom: spacing.xs + insets.bottom }]} pointerEvents="none">{t("clips.swipeHint").toUpperCase()} ⌃</Text> : null}
    </View>
  );
}

const glass = { overflow: "hidden", borderWidth: sizes.hairline, borderColor: withAlpha(colors.text, 0.2), backgroundColor: withAlpha(colors.bg, 0.25) };
const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#000" },
  clip:        { overflow: "hidden" },   // el reproductor es más alto que el clip (ver PLAYER_CROP)
  frost:       { zIndex: 0 },
  above:       { zIndex: 1 },
  middle:      { alignItems: "center", justifyContent: "center" },
  empty:       { ...type.body, color: colors.textSecondary },
  shadeTop:    { position: "absolute", top: 0, left: 0, right: 0, height: sizes.chart * 1.6, backgroundColor: withAlpha("#000", 0.28) },
  shadeBottom: { position: "absolute", bottom: 0, left: 0, right: 0, height: sizes.chart * 3, backgroundColor: withAlpha("#000", 0.38) },
  center:      { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: spacing.md },
  bigPlay:     { width: sizes.avatarHero, height: sizes.avatarHero, borderRadius: sizes.avatarHero / 2, alignItems: "center", justifyContent: "center", ...glass },
  bigPlayText: { ...type.title, color: colors.text },
  openYt:      { ...type.captionStrong, color: colors.text, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill, ...glass },
  top:         { position: "absolute", left: spacing.md, right: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  round:       { width: sizes.avatarMd, height: sizes.avatarMd, borderRadius: sizes.avatarMd / 2, alignItems: "center", justifyContent: "center", ...glass },
  roundSpacer: { width: sizes.avatarMd },
  seg:         { flexDirection: "row", gap: spacing.lg },
  segText:     { ...type.bodyStrong, color: withAlpha(colors.text, 0.65), paddingBottom: spacing.xxs },
  segOn:       { color: colors.text, borderBottomWidth: sizes.borderThick, borderBottomColor: colors.text },
  chips:       { position: "absolute", left: spacing.md, right: spacing.md, flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip:        { height: sizes.avatarSm - spacing.xs, paddingHorizontal: spacing.md, borderRadius: radii.pill, alignItems: "center", justifyContent: "center", ...glass },
  chipOn:      { backgroundColor: withAlpha(colors.text, 0.92), borderColor: colors.text },
  chipText:    { ...type.smallStrong, color: colors.text },
  chipTextOn:  { color: colors.bg },
  mute:        { position: "absolute", right: spacing.md, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, height: sizes.avatarSm - spacing.xs, borderRadius: radii.pill, ...glass },
  muteText:    { ...type.smallStrong, color: colors.text },
  side:        { position: "absolute", right: spacing.sm, alignItems: "center", gap: spacing.md },
  avatar:      { width: sizes.avatarLg + spacing.xs, height: sizes.avatarLg + spacing.xs, borderRadius: (sizes.avatarLg + spacing.xs) / 2, alignItems: "center", justifyContent: "center", borderWidth: sizes.borderThick, borderColor: colors.text },
  sideBtn:     { alignItems: "center", gap: spacing.xxs },
  sideCircle:  { width: sizes.avatarLg + spacing.xs, height: sizes.avatarLg + spacing.xs, borderRadius: (sizes.avatarLg + spacing.xs) / 2, alignItems: "center", justifyContent: "center", ...glass },
  sideActive:  { borderColor: withAlpha("#F3D58A", 0.8), backgroundColor: withAlpha("#F3D58A", 0.2) },
  sideText:    { ...type.micro, color: colors.text },
  ytText:      { ...type.heading, color: colors.text },
  info:        { position: "absolute", left: spacing.md, right: sizes.avatarHero },
  channelRow:  { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  channel:     { ...type.heading, color: colors.text, flexShrink: 1 },
  official:    { ...type.micro, flexShrink: 0, color: colors.text, backgroundColor: withAlpha(colors.text, 0.2), borderRadius: radii.xs, paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs, overflow: "hidden" },
  title:       { ...type.body, color: colors.text, marginTop: spacing.xs },
  meta:        { ...type.captionStrong, color: withAlpha(colors.text, 0.85), marginTop: spacing.xs },
  tagRow:      { flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm },
  gameTag:     { borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  gameTagText: { ...type.micro, color: colors.onAccent, letterSpacing: 0.8 },
  newTag:      { borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, backgroundColor: withAlpha(colors.text, 0.2) },
  newText:     { ...type.micro, color: colors.text, letterSpacing: 0.8 },
  track:       { position: "absolute", left: 0, right: 0, height: spacing.xxs + 1, backgroundColor: withAlpha(colors.text, 0.22) },
  fill:        { height: "100%", backgroundColor: colors.text },
  dots:        { position: "absolute", right: spacing.xxs, top: "45%", gap: spacing.xs },
  dot:         { width: spacing.xs, height: spacing.md, borderRadius: radii.xs, backgroundColor: withAlpha(colors.text, 0.3) },
  dotOn:       { height: spacing.xl, backgroundColor: colors.text },
  hint:        { position: "absolute", alignSelf: "center", ...type.micro, color: withAlpha(colors.text, 0.75), letterSpacing: 1 },
});
