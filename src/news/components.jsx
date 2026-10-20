import React, { useEffect, useRef, useState } from "react";
import { View, Text, Image, ScrollView, StyleSheet } from "react-native";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { PressableScale } from "../components/ui";
import GameLogo from "../components/GameLogo";
import { getGameMeta } from "../games/registry";
import { imageOf, posterOf } from "./api";
import { useT } from "../i18n/I18nProvider";
import { colors, radii, sizes, spacing, type, fontSizes, withAlpha } from "../theme";

// Piezas de la pestaña Noticias y del lector: degradado para leer sobre las imágenes, etiqueta del juego,
// carrusel destacado, tarjetas de las filas y pósteres de los campeones cambiados.

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

/** Insignia "▲ SUBE" / "▼ BAJA" de un campeón o de un cambio */
export function DirBadge({ dir, style }) {
  const t = useT();
  if (!dir) return null;
  const up = dir > 0;
  return (
    <View style={[styles.dir, { backgroundColor: up ? withAlpha(colors.win, 0.92) : withAlpha(colors.loss, 0.92) }, style]}>
      <Text style={styles.dirText}>{up ? `▲ ${t("news.up")}` : `▼ ${t("news.down")}`}</Text>
    </View>
  );
}

const ADVANCE_MS = 6000;

/**
 * Carrusel destacado tipo Netflix: una noticia a todo lo ancho que pasa sola cada 6 s (las barritas de arriba muestran
 * el avance, como las historias) y se puede deslizar. Al deslizar a mano el temporizador vuelve a empezar.
 *  - items, onOpen(item), kindLabel(item), metaLine(item), cta(item)
 */
export function HeroCarousel({ items, onOpen, kindLabel, metaLine, cta }) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const scroller = useRef(null);
  const progress = useSharedValue(0);
  const bar = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  useEffect(() => {
    if (!width || items.length < 2) return undefined;
    progress.value = 0;
    progress.value = withTiming(1, { duration: ADVANCE_MS, easing: Easing.linear });
    const id = setTimeout(() => {
      const next = (index + 1) % items.length;
      scroller.current?.scrollTo({ x: next * width, animated: true });
      setIndex(next);
    }, ADVANCE_MS);
    return () => { clearTimeout(id); cancelAnimation(progress); };
  }, [index, width, items.length]);

  if (!items.length) return null;
  return (
    <View style={styles.hero} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
      {width ? (
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={e => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        >
          {items.map(item => (
            <PressableScale key={item.id} onPress={() => onOpen(item)} scaleTo={0.99} style={[styles.slide, { width }]} accessibilityRole="button" accessibilityLabel={item.title}>
              {item.kind === "champion" ? <View style={[StyleSheet.absoluteFill, styles.slideGold]} /> : null}
              {imageOf(item) ? <Image source={{ uri: imageOf(item) }} style={item.kind === "champion" ? styles.slideCrest : StyleSheet.absoluteFill} resizeMode={item.kind === "champion" ? "contain" : "cover"} /> : null}
              <Shade from={0.05} mid={0.45} to={0.97} />
              <View style={styles.slideBody}>
                <GamePill game={item.game} label={kindLabel(item)} solid />
                <Text style={styles.slideTitle} numberOfLines={3}>{item.kind === "champion" ? metaLine(item, true) : item.title}</Text>
                <Text style={styles.slideMeta} numberOfLines={2}>{metaLine(item)}</Text>
                <View style={styles.cta}><Text style={styles.ctaText}>{cta(item)}</Text></View>
              </View>
            </PressableScale>
          ))}
        </ScrollView>
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

/** Tarjeta de una fila (imagen con la etiqueta del juego, título y fecha) */
export function NewsCard({ item, onPress, wide, sub }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.96} haptic style={[styles.card, wide && styles.cardWide]} accessibilityRole="button" accessibilityLabel={item.title}>
      {imageOf(item) ? <Image source={{ uri: imageOf(item) }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
      <Shade from={0} mid={0.35} to={0.94} />
      <GamePill game={item.game} solid style={styles.cardPill} />
      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
      {sub ? <Text style={styles.cardSub} numberOfLines={1}>{sub}</Text> : null}
    </PressableScale>
  );
}

/** Póster de un campeón cambiado en el parche, con su sube / baja */
export function ChangedPoster({ entry, onPress }) {
  const first = entry.groups?.[0];
  return (
    <PressableScale onPress={onPress} scaleTo={0.95} haptic style={styles.poster} accessibilityRole="button" accessibilityLabel={entry.name}>
      {posterOf(entry) ? <Image source={{ uri: posterOf(entry) }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
      <Shade from={0} mid={0.2} to={0.95} />
      <DirBadge dir={entry.dir} style={styles.posterDir} />
      <Text style={styles.posterName} numberOfLines={1}>{entry.name}</Text>
      {first?.title ? <Text style={styles.posterSub} numberOfLines={1}>{first.title}</Text> : null}
    </PressableScale>
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
  hero:       { height: sizes.chart * 2.5, borderRadius: radii.xl, overflow: "hidden", backgroundColor: colors.surfaceRaised },
  slide:      { height: "100%", justifyContent: "flex-end" },
  slideGold:  { backgroundColor: withAlpha(colors.gold, 0.14) },
  slideCrest: { position: "absolute", top: spacing.xl, right: spacing.lg, width: sizes.chart, height: sizes.chart, opacity: 0.95 },
  slideBody:  { padding: spacing.md, gap: spacing.xs },
  slideTitle: { ...type.title, color: colors.text, marginTop: spacing.xs },
  slideMeta:  { ...type.caption, color: colors.textSecondary },
  cta:        { alignSelf: "flex-start", marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.md, backgroundColor: colors.text },
  ctaText:    { ...type.captionStrong, color: colors.bg },
  bars:       { position: "absolute", top: spacing.sm, left: spacing.md, right: spacing.md, flexDirection: "row", gap: spacing.xs },
  barTrack:   { flex: 1, height: spacing.xxs + 1, borderRadius: radii.xs, backgroundColor: withAlpha(colors.text, 0.28), overflow: "hidden" },
  barFull:    { flex: 1, backgroundColor: colors.text },
  barFill:    { height: "100%", backgroundColor: colors.text },
  card:       { width: sizes.chart * 1.25, height: sizes.chart * 0.8, borderRadius: radii.lg, overflow: "hidden", padding: spacing.sm, justifyContent: "flex-end", backgroundColor: colors.surfaceRaised },
  cardWide:   { width: sizes.chart * 2, height: sizes.chart * 0.92 },
  cardPill:   { position: "absolute", top: spacing.sm, left: spacing.sm },
  cardTitle:  { ...type.smallStrong, color: colors.text },
  cardSub:    { ...type.micro, color: colors.textSecondary, marginTop: spacing.xxs },
  poster:     { width: sizes.chart * 0.88, height: sizes.chart * 1.25, borderRadius: radii.lg, overflow: "hidden", padding: spacing.sm, justifyContent: "flex-end", backgroundColor: colors.surfaceRaised },
  posterDir:  { position: "absolute", top: spacing.sm, right: spacing.sm },
  posterName: { ...type.smallStrong, color: colors.text },
  posterSub:  { ...type.micro, color: colors.textSecondary },
  railHead:   { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: spacing.lg, marginBottom: spacing.sm },
  railTitle:  { ...type.section, color: colors.text },
  railAction: { ...type.captionStrong, color: colors.textSecondary },
  rail:       { gap: spacing.sm, paddingRight: spacing.sm },
});
