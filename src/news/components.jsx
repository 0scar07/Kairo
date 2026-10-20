import React, { useEffect, useRef, useState } from "react";
import { View, Text, Image, Pressable, ScrollView, StyleSheet } from "react-native";
import Animated, {
  Easing, FadeInDown, FadeInRight, cancelAnimation, interpolate, useAnimatedScrollHandler, useAnimatedStyle,
  useReducedMotion, useSharedValue, withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { LiveDot } from "../components/ui";
import GameLogo from "../components/GameLogo";
import { getGameMeta } from "../games/registry";
import { KenBurnsImage, OutlineNumber, PressCard, Pulse, Shine } from "./fx";
import { imageOf, posterOf } from "./api";
import { useT } from "../i18n/I18nProvider";
import { select } from "../utils/haptics";
import { colors, radii, sizes, spacing, type, fontSizes, withAlpha } from "../theme";

// Piezas de la pestaña Noticias y del lector: degradado para leer sobre las imágenes, etiqueta del juego,
// carrusel destacado, tarjetas, pósteres, Top 5, Seguir leyendo y Mi lista.

let shadeId = 0;
export function Shade({ from = 0.05, to = 0.96, mid = 0.55 }) {
  const [id] = useState(() => `newsShade${++shadeId}`);
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.bg} stopOpacity={from} />
          <Stop offset="0.5" stopColor={colors.bg} stopOpacity={mid} />
          <Stop offset="1" stopColor={colors.bg} stopOpacity={to} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/** Etiqueta con el color del juego: "LOL · NOTAS DEL PARCHE" */
export function GamePill({ game, label, solid, style }) {
  const meta = getGameMeta(game);
  const accent = meta?.accent || colors.textMuted;
  return (
    <View style={[styles.pill, { backgroundColor: solid ? withAlpha(accent, 0.92) : withAlpha(accent, 0.18) }, style]}>
      <Text style={[styles.pillText, { color: solid ? colors.onAccent : accent }]} numberOfLines={1}>
        {[meta?.short, label].filter(Boolean).join(" · ").toUpperCase()}
      </Text>
    </View>
  );
}

/** Insignia "▲ SUBE" / "▼ BAJA"; con `glow`, la de subir late con luz verde */
export function DirBadge({ dir, style, glow }) {
  const t = useT();
  if (!dir) return null;
  const up = dir > 0;
  const badge = (
    <View style={[styles.dir, { backgroundColor: up ? withAlpha(colors.win, 0.92) : withAlpha(colors.loss, 0.92) }]}>
      <Text style={styles.dirText}>{up ? `▲ ${t("news.up")}` : `▼ ${t("news.down")}`}</Text>
    </View>
  );
  return glow && up ? <Pulse color={colors.win} style={style}>{badge}</Pulse> : <View style={style}>{badge}</View>;
}

/** Punto "NUEVO" que late (noticias de las últimas 48 h) */
export function NewTag() {
  const t = useT();
  return (
    <View style={styles.newTag}>
      <LiveDot size={sizes.dot} />
      <Text style={styles.newText}>{t("news.new").toUpperCase()}</Text>
    </View>
  );
}
export const isNew = item => Boolean(item?.date) && Date.now() - new Date(item.date).getTime() < 48 * 60 * 60 * 1000;

const ADVANCE_MS = 6000;

/**
 * Carrusel destacado tipo Netflix / Apple TV: cada noticia con zoom lento sobre su arte (Ken Burns), parallax en capas
 * al deslizar (el arte va más lento que el texto), el texto entra en cascada y pasa sola cada 6 s con barritas tipo
 * historias. Mantener presionado pausa; deslizar a mano reinicia el temporizador. Avisa el color de la que se ve.
 *  - items, onOpen(item), onLongPress(item), onColor(color), kindLabel, metaLine, cta
 */
export function HeroCarousel({ items, onOpen, onLongPress, onColor, kindLabel, metaLine, cta }) {
  const reduce = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const scroller = useRef(null);
  const x = useSharedValue(0);
  const progress = useSharedValue(0);
  const bar = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  const onScroll = useAnimatedScrollHandler(e => { x.value = e.contentOffset.x; });

  useEffect(() => { onColor?.(items[index]?.color || null); }, [index, items]);

  useEffect(() => {
    if (!width || items.length < 2 || paused) return undefined;
    progress.value = 0;
    progress.value = withTiming(1, { duration: ADVANCE_MS, easing: Easing.linear });
    const id = setTimeout(() => {
      const next = (index + 1) % items.length;
      scroller.current?.scrollTo({ x: next * width, animated: !reduce });
      setIndex(next);
    }, ADVANCE_MS);
    return () => { clearTimeout(id); cancelAnimation(progress); };
  }, [index, width, items.length, paused]);

  if (!items.length) return null;
  return (
    <View style={styles.hero} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
      {width ? (
        <Animated.ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={e => {
            const i = Math.round(e.nativeEvent.contentOffset.x / width);
            if (i !== index) { select(); setIndex(i); }
          }}
        >
          {items.map((item, i) => (
            <Slide
              key={item.id} item={item} i={i} width={width} x={x} active={i === index}
              onPress={() => onOpen(item)}
              onLongPress={() => { setPaused(true); onLongPress?.(item); }}
              onPressOut={() => setPaused(false)}
              kindLabel={kindLabel} metaLine={metaLine} cta={cta}
            />
          ))}
        </Animated.ScrollView>
      ) : null}
      {items.length > 1 ? (
        <View style={styles.bars} pointerEvents="none">
          {items.map((it, i) => (
            <View key={it.id} style={styles.barTrack}>
              {i < index ? <View style={styles.barFull} /> : i === index ? <Animated.View style={[styles.barFill, bar]} /> : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Slide({ item, i, width, x, active, onPress, onLongPress, onPressOut, kindLabel, metaLine, cta }) {
  const champion = item.kind === "champion";
  // Parallax: el arte se mueve a la mitad de velocidad y el texto un poco más rápido que el dedo
  const art = useAnimatedStyle(() => ({ transform: [{ translateX: (x.value - i * width) * 0.5 }] }));
  const text = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(x.value - i * width), [0, width * 0.6], [1, 0]),
    transform: [{ translateX: (i * width - x.value) * 0.25 }],
  }));
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} onPressOut={onPressOut} delayLongPress={280} style={[styles.slide, { width }]} accessibilityRole="button" accessibilityLabel={item.title}>
      <Animated.View style={[StyleSheet.absoluteFill, art]}>
        {champion ? <View style={[StyleSheet.absoluteFill, styles.slideGold]} /> : <KenBurnsImage uri={imageOf(item)} active={active} />}
        {champion && imageOf(item) ? <Image source={{ uri: imageOf(item) }} style={styles.slideCrest} resizeMode="contain" /> : null}
      </Animated.View>
      <Shade from={0.05} mid={0.45} to={0.97} />
      <Animated.View style={[styles.slideBody, text]}>
        {/* La cascada: al volverse activa, cada línea entra un poco después que la anterior */}
        <Animated.View key={`${item.id}-${active}`} entering={active ? FadeInDown.duration(420) : undefined} style={styles.tagRow}>
          <GamePill game={item.game} label={kindLabel(item)} solid />
          {isNew(item) ? <NewTag /> : null}
        </Animated.View>
        <Animated.Text key={`t-${item.id}-${active}`} entering={active ? FadeInDown.delay(80).duration(420) : undefined} style={styles.slideTitle} numberOfLines={3}>
          {champion ? metaLine(item, true) : item.title}
        </Animated.Text>
        <Animated.Text key={`m-${item.id}-${active}`} entering={active ? FadeInDown.delay(160).duration(420) : undefined} style={styles.slideMeta} numberOfLines={2}>{metaLine(item)}</Animated.Text>
        <Animated.View key={`c-${item.id}-${active}`} entering={active ? FadeInDown.delay(240).duration(420) : undefined} style={styles.cta}>
          <Text style={styles.ctaText}>{cta(item)}</Text>
          <Shine />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

/** Marcador de Mi lista sobre una tarjeta */
export function SavedMark() {
  return (
    <View style={styles.mark}>
      <Svg width={fontSizes.sm} height={fontSizes.sm} viewBox="0 0 24 24"><Path d="M6 3h12v18l-6-4-6 4z" fill="#F3D58A" /></Svg>
    </View>
  );
}

/** Tarjeta de una fila (imagen con la etiqueta del juego, título y fecha), con relieve y vista previa */
export function NewsCard({ item, onPress, onLongPress, wide, sub, saved }) {
  return (
    <PressCard onPress={onPress} onLongPress={onLongPress} style={[styles.card, wide && styles.cardWide]} label={item.title}>
      {imageOf(item) ? <Image source={{ uri: imageOf(item) }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
      <Shade from={0} mid={0.35} to={0.94} />
      <GamePill game={item.game} solid style={styles.cardPill} />
      {saved ? <SavedMark /> : null}
      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
      {sub ? <Text style={styles.cardSub} numberOfLines={1}>{sub}</Text> : null}
    </PressCard>
  );
}

/** Póster de un campeón cambiado en el parche; entran uno tras otro y el mejor lleva brillo verde */
export function ChangedPoster({ entry, index = 0, onPress, highlight }) {
  const t = useT();
  const lines = entry.groups?.reduce((n, g) => n + g.lines.length, 0) || 0;
  return (
    <Animated.View entering={FadeInRight.delay(index * 70).duration(380)}>
      <PressCard onPress={onPress} style={[styles.poster, highlight && styles.posterGlow]} label={entry.name}>
        {posterOf(entry) ? <Image source={{ uri: posterOf(entry) }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
        <Shade from={0} mid={0.2} to={0.95} />
        <DirBadge dir={entry.dir} style={styles.posterDir} />
        <Text style={styles.posterName} numberOfLines={1}>{entry.name}</Text>
        <Text style={styles.posterSub} numberOfLines={1}>{lines === 1 ? t("news.oneChange") : t("news.changes", { n: lines })}</Text>
      </PressCard>
    </Animated.View>
  );
}

/** Top 5 del parche al estilo Netflix: número gigante con contorno y el póster encima */
export function TopFive({ entries, onPress }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topRow}>
      {entries.map((e, i) => (
        <Animated.View key={e.name} entering={FadeInRight.delay(i * 90).duration(420)} style={styles.topItem}>
          <OutlineNumber n={i + 1} size={sizes.chart * 0.95} />
          <PressCard onPress={() => onPress(e)} style={styles.topPoster} label={`${i + 1}. ${e.name}`}>
            {posterOf(e) ? <Image source={{ uri: posterOf(e) }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
            <Shade from={0} mid={0.3} to={0.95} />
            <DirBadge dir={e.dir} style={styles.topDir} />
            <Text style={styles.topName} numberOfLines={1}>{e.name}</Text>
          </PressCard>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

/** Tarjeta de "Seguir leyendo": su imagen con botón de reproducir, barra de avance y dónde te quedaste */
export function ContinueCard({ item, onPress }) {
  const t = useT();
  return (
    <PressCard onPress={onPress} style={styles.cont} label={item.title}>
      <View style={styles.contImg}>
        {imageOf(item) ? <Image source={{ uri: imageOf(item) }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
        <View style={styles.play}><Text style={styles.playText}>▶</Text></View>
      </View>
      <View style={styles.contTrack}><View style={[styles.contFill, { width: `${Math.round(item.progress * 100)}%` }]} /></View>
      <View style={styles.contBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.contSub} numberOfLines={1}>{item.section ? t("news.leftAt", { section: item.section, pct: Math.round(item.progress * 100) }) : `${Math.round(item.progress * 100)} %`}</Text>
      </View>
    </PressCard>
  );
}

/** Fila horizontal con título */
export function Rail({ title, action, onAction, children }) {
  return (
    <View>
      <View style={styles.railHead}>
        <Text style={styles.railTitle}>{title}</Text>
        {action ? <Text style={styles.railAction} onPress={onAction} accessibilityRole="button">{action} ›</Text> : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>{children}</ScrollView>
    </View>
  );
}

/** Logo del juego para los chips de filtro */
export const ChipLogo = ({ game }) => <GameLogo game={game} size={fontSizes.base} color={getGameMeta(game)?.accent} brand />;

const styles = StyleSheet.create({
  pill:       { alignSelf: "flex-start", borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  pillText:   { ...type.micro, letterSpacing: 0.8 },
  dir:        { alignSelf: "flex-start", borderRadius: radii.sm, paddingHorizontal: spacing.xs + spacing.xxs, paddingVertical: spacing.xxs },
  dirText:    { ...type.micro, color: colors.onAccent, letterSpacing: 0.4 },
  newTag:     { flexDirection: "row", alignItems: "center", gap: spacing.xxs, borderRadius: radii.sm, paddingRight: spacing.sm, backgroundColor: withAlpha(colors.text, 0.14), borderWidth: sizes.hairline, borderColor: withAlpha(colors.text, 0.25) },
  newText:    { ...type.micro, color: colors.text, letterSpacing: 0.8 },
  tagRow:     { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  hero:       { height: sizes.chart * 2.5, borderRadius: radii.xl, overflow: "hidden", backgroundColor: colors.surfaceRaised, boxShadow: `0 18px 40px ${withAlpha(colors.bg, 0.6)}` },
  slide:      { height: "100%", justifyContent: "flex-end", overflow: "hidden" },
  slideGold:  { backgroundColor: withAlpha(colors.gold, 0.14) },
  slideCrest: { position: "absolute", top: spacing.xl, right: spacing.lg, width: sizes.chart, height: sizes.chart, opacity: 0.95 },
  slideBody:  { padding: spacing.md, gap: spacing.xs },
  slideTitle: { ...type.title, color: colors.text, marginTop: spacing.xs },
  slideMeta:  { ...type.caption, color: colors.textSecondary },
  cta:        { alignSelf: "flex-start", marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.md, backgroundColor: colors.text, overflow: "hidden" },
  ctaText:    { ...type.captionStrong, color: colors.bg },
  bars:       { position: "absolute", top: spacing.sm, left: spacing.md, right: spacing.md, flexDirection: "row", gap: spacing.xs },
  barTrack:   { flex: 1, height: spacing.xxs + 1, borderRadius: radii.xs, backgroundColor: withAlpha(colors.text, 0.28), overflow: "hidden" },
  barFull:    { flex: 1, backgroundColor: colors.text },
  barFill:    { height: "100%", backgroundColor: colors.text },
  mark:       { position: "absolute", top: spacing.sm, right: spacing.sm, width: sizes.item, height: sizes.item, borderRadius: radii.sm, alignItems: "center", justifyContent: "center", backgroundColor: withAlpha(colors.bg, 0.6), borderWidth: sizes.hairline, borderColor: withAlpha(colors.text, 0.25) },
  card:       { width: sizes.chart * 1.25, height: sizes.chart * 0.8, borderRadius: radii.lg, overflow: "hidden", padding: spacing.sm, justifyContent: "flex-end", backgroundColor: colors.surfaceRaised },
  cardWide:   { width: sizes.chart * 2, height: sizes.chart * 0.92 },
  cardPill:   { position: "absolute", top: spacing.sm, left: spacing.sm },
  cardTitle:  { ...type.smallStrong, color: colors.text },
  cardSub:    { ...type.micro, color: colors.textSecondary, marginTop: spacing.xxs },
  poster:     { width: sizes.chart * 0.88, height: sizes.chart * 1.25, borderRadius: radii.lg, overflow: "hidden", padding: spacing.sm, justifyContent: "flex-end", backgroundColor: colors.surfaceRaised },
  posterGlow: { borderWidth: sizes.hairline, borderColor: withAlpha(colors.win, 0.7), boxShadow: `0 0 22px ${withAlpha(colors.win, 0.4)}` },
  posterDir:  { position: "absolute", top: spacing.sm, right: spacing.sm },
  posterName: { ...type.smallStrong, color: colors.text },
  posterSub:  { ...type.micro, color: colors.textSecondary },
  topRow:     { paddingRight: spacing.sm },
  topItem:    { width: sizes.chart, height: sizes.chart, justifyContent: "flex-end" },
  topPoster:  { marginLeft: sizes.avatarLg + spacing.xs, width: sizes.chart * 0.6, height: sizes.chart * 0.9, borderRadius: radii.md, overflow: "hidden", padding: spacing.xs, justifyContent: "flex-end", backgroundColor: colors.surfaceRaised, boxShadow: `0 10px 20px ${withAlpha(colors.bg, 0.6)}` },
  topDir:     { position: "absolute", top: spacing.xs, right: spacing.xs },
  topName:    { ...type.micro, color: colors.text },
  cont:       { width: sizes.chart * 1.4, borderRadius: radii.lg, overflow: "hidden", backgroundColor: colors.surface, borderWidth: sizes.hairline, borderColor: colors.border },
  contImg:    { height: sizes.chart * 0.7, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceRaised },
  play:       { width: sizes.avatarSm, height: sizes.avatarSm, borderRadius: sizes.avatarSm / 2, alignItems: "center", justifyContent: "center", backgroundColor: withAlpha(colors.bg, 0.55), borderWidth: sizes.hairline, borderColor: withAlpha(colors.text, 0.4) },
  playText:   { ...type.micro, color: colors.text },
  contTrack:  { height: spacing.xxs + 1, backgroundColor: withAlpha(colors.text, 0.12) },
  contFill:   { height: "100%", backgroundColor: colors.loss },
  contBody:   { padding: spacing.sm },
  contSub:    { ...type.micro, color: colors.textMuted, marginTop: spacing.xxs },
  railHead:   { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: spacing.lg, marginBottom: spacing.sm },
  railTitle:  { ...type.section, color: colors.text },
  railAction: { ...type.captionStrong, color: colors.textSecondary },
  rail:       { gap: spacing.sm, paddingRight: spacing.sm },
});
