import React, { useEffect, useState } from "react";
import { View, Text, Image, Pressable, ScrollView, StyleSheet } from "react-native";
import Animated, {
  Easing, FadeIn, FadeOut, interpolate, interpolateColor, useAnimatedProps, useAnimatedReaction, useAnimatedStyle,
  useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming, Extrapolation,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText } from "react-native-svg";
import { select, tap } from "../utils/haptics";
import { accents, colors, radii, sizes, spacing, type, withAlpha } from "../theme";

// Efectos de la pestaña Noticias y del lector. Todos respetan "Reducir movimiento": con él activado se quedan quietos.

const AnimatedImage = Animated.createAnimatedComponent(Image);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const KEN_MS = 6500;

/** Imagen con efecto Ken Burns: se acerca y se desplaza despacio mientras `active` */
export function KenBurnsImage({ uri, active = true, style, resizeMode = "cover" }) {
  const reduce = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    p.value = 0;
    if (active) p.value = withTiming(1, { duration: KEN_MS, easing: Easing.inOut(Easing.quad) });
  }, [active, reduce, uri]);
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(p.value, [0, 1], [1.02, 1.14]) }, { translateX: interpolate(p.value, [0, 1], [0, -spacing.md]) }, { translateY: interpolate(p.value, [0, 1], [0, -spacing.sm]) }],
  }));
  if (!uri) return null;
  return <AnimatedImage source={{ uri }} style={[StyleSheet.absoluteFill, style, anim]} resizeMode={resizeMode} />;
}

/** Destello que cruza un botón cada pocos segundos */
export function Shine() {
  const reduce = useReducedMotion();
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => {
    if (reduce || !w) return;
    x.value = withRepeat(withSequence(withTiming(0, { duration: 1700 }), withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) })), -1);
  }, [w, reduce]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(x.value, [0, 1], [-w * 0.6, w * 1.4]) }, { skewX: "-20deg" }] }));
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={e => setW(e.nativeEvent.layout.width)}>
      {w && !reduce ? (
        <Animated.View style={[styles.shine, anim]}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="newsShine" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#fff" stopOpacity="0" />
                <Stop offset="0.5" stopColor="#fff" stopOpacity="0.8" />
                <Stop offset="1" stopColor="#fff" stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#newsShine)" />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}

/**
 * Tarjeta con relieve: al presionar se hunde, se inclina un poco y le cruza un brillo. Mantener presionado llama a
 * `onLongPress` con una vibración (la vista previa).
 */
export function PressCard({ onPress, onLongPress, style, children, label }) {
  const reduce = useReducedMotion();
  const p = useSharedValue(0);
  const anim = useAnimatedStyle(() => ({
    transform: [{ perspective: 600 }, { scale: interpolate(p.value, [0, 1], [1, 0.96]) }, { rotateX: reduce ? "0deg" : `${interpolate(p.value, [0, 1], [0, 5])}deg` }],
  }));
  const gloss = useAnimatedStyle(() => ({ opacity: p.value * 0.35 }));
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress ? () => { tap(); onLongPress(); } : undefined}
      delayLongPress={320}
      onPressIn={() => { p.value = withTiming(1, { duration: 120 }); }}
      onPressOut={() => { p.value = withSpring(0, { damping: 14, stiffness: 220 }); }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Animated.View style={[style, anim]}>
        {children}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.gloss, gloss]} />
      </Animated.View>
    </Pressable>
  );
}

/**
 * Chips de filtro con una pastilla que se desliza hasta el elegido, con el brillo de su color.
 *  - items: [{ key, label, icon, accent }], value, onChange(key)
 */
export function PillChips({ items, value, onChange, style }) {
  const [layouts, setLayouts] = useState({});
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const active = layouts[value];
  const accent = items.find(i => i.key === value)?.accent || accents.brand;
  useEffect(() => {
    if (!active) return;
    x.value = withSpring(active.x, { damping: 18, stiffness: 220 });
    w.value = withSpring(active.width, { damping: 18, stiffness: 220 });
  }, [active?.x, active?.width]);
  const pill = useAnimatedStyle(() => ({ width: w.value, transform: [{ translateX: x.value }] }));
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.chipScroll, style]} contentContainerStyle={styles.chipRow}>
      {active ? <Animated.View pointerEvents="none" style={[styles.pill, { borderColor: accent, backgroundColor: withAlpha(accent, 0.18), boxShadow: `0 0 16px ${withAlpha(accent, 0.45)}` }, pill]} /> : null}
      {items.map(i => {
        const on = i.key === value;
        return (
          <Pressable
            key={i.key}
            onLayout={e => { const { x: lx, width } = e.nativeEvent.layout; setLayouts(l => ({ ...l, [i.key]: { x: lx, width } })); }}
            onPress={() => { if (!on) { select(); onChange(i.key); } }}
            style={[styles.chip, on && styles.chipOn]}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={i.label}
          >
            {i.icon}
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{i.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Número gigante con contorno, como el Top 10 de Netflix */
export function OutlineNumber({ n, size = sizes.chart }) {
  return (
    <Svg width={size * 0.62} height={size} style={styles.outline}>
      <SvgText x="0" y={size * 0.9} fontSize={size * 0.84} fontWeight="800" fontFamily="Sora_800ExtraBold" fill={colors.bg} stroke={withAlpha("#F3D58A", 0.8)} strokeWidth={2} letterSpacing={-6}>{String(n)}</SvgText>
    </Svg>
  );
}

/** Carga con un brillo dorado que pasa (en vez de cuadros grises) */
export function GoldSkeleton({ width = "100%", height, radius = radii.lg, style }) {
  const reduce = useReducedMotion();
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => { if (!reduce && w) x.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.linear }), -1); }, [w, reduce]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(x.value, [0, 1], [-w, w]) }] }));
  return (
    <View style={[{ width, height, borderRadius: radius }, styles.skel, style]} onLayout={e => setW(e.nativeEvent.layout.width)}>
      {w ? (
        <Animated.View style={[StyleSheet.absoluteFill, anim]}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="goldSkel" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#F3D58A" stopOpacity="0" />
                <Stop offset="0.5" stopColor="#F3D58A" stopOpacity="0.16" />
                <Stop offset="1" stopColor="#F3D58A" stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#goldSkel)" />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}

const K_PATH = "M372 290 V734 M372 520 L664 290 M480 500 L668 734";   // la K del logo (assets/brand/icon.svg)
const K_LENGTH = 1300;
/** El logo de Kairo dibujándose mientras se buscan las noticias */
export function BrandLoader({ label }) {
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) p.value = withRepeat(withSequence(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.cubic) }), withDelay(300, withTiming(0, { duration: 0 }))), -1);
  }, [reduce]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: K_LENGTH * (1 - p.value) }));
  return (
    <View style={styles.loader} accessibilityRole="progressbar" accessibilityLabel={label}>
      <Svg width={sizes.avatarLg} height={sizes.avatarLg} viewBox="250 220 520 580">
        <AnimatedPath d={K_PATH} stroke={accents.brand} strokeWidth={84} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray={K_LENGTH} animatedProps={props} />
      </Svg>
      {label ? <Text style={styles.loaderText}>{label.toUpperCase()}</Text> : null}
    </View>
  );
}

/** Luz ambiental: un resplandor del color de la noticia que se ve; cambia con un fundido */
export function AmbientGlow({ color, style }) {
  if (!color) return null;
  return (
    <Animated.View key={color} entering={FadeIn.duration(700)} exiting={FadeOut.duration(700)} pointerEvents="none" style={[styles.ambient, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={`amb${color.slice(1)}`} cx="50%" cy="40%" r="55%">
            <Stop offset="0" stopColor={color} stopOpacity="0.95" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#amb${color.slice(1)})`} />
      </Svg>
    </Animated.View>
  );
}

/** Barra de equilibrio del parche: los que suben contra los que bajan, que se llena al aparecer */
export function BalanceBar({ up, down, upLabel, downLabel, title }) {
  const reduce = useReducedMotion();
  const total = Math.max(1, up + down);
  const a = useSharedValue(reduce ? 1 : 0);
  useEffect(() => { if (!reduce) { a.value = 0; a.value = withDelay(150, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })); } }, [up, down]);
  const upStyle = useAnimatedStyle(() => ({ width: `${(up / total) * 100 * a.value}%` }));
  const downStyle = useAnimatedStyle(() => ({ width: `${(down / total) * 100 * a.value}%` }));
  return (
    <View style={styles.balance} accessible accessibilityLabel={`${upLabel} · ${downLabel}`}>
      <View style={styles.balanceRow}>
        <Text style={[styles.balanceText, { color: colors.win }]}>▲ {upLabel}</Text>
        <Text style={styles.balanceTitle}>{title}</Text>
        <Text style={[styles.balanceText, { color: colors.loss }]}>{downLabel} ▼</Text>
      </View>
      <View style={styles.balanceTrack}>
        <Animated.View style={[styles.balanceUp, upStyle]} />
        <View style={styles.flex} />
        <Animated.View style={[styles.balanceDown, downStyle]} />
      </View>
    </View>
  );
}

/** Insignia que late con luz (▲ SUBE) */
export function Pulse({ color, children, style }) {
  const reduce = useReducedMotion();
  const g = useSharedValue(0);
  useEffect(() => { if (!reduce) g.value = withRepeat(withSequence(withTiming(1, { duration: 1100 }), withTiming(0, { duration: 1100 })), -1); }, [reduce]);
  const halo = useAnimatedStyle(() => ({ opacity: g.value * 0.6, transform: [{ scale: 1 + g.value * 0.18 }] }));
  return (
    <View style={style}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radii.sm, backgroundColor: color }, halo]} />
      {children}
    </View>
  );
}

/**
 * Aparece al llegar a la vista: se desvanece hacia arriba según el scroll (en el hilo de la UI). Una vez visto se queda.
 *  - scrollY y viewport (shared values del ScrollView), offset: dónde empieza su contenedor dentro del scroll
 */
export function Reveal({ scrollY, viewport, offset, children, style }) {
  const reduce = useReducedMotion();
  const y = useSharedValue(1e6);
  const seen = useSharedValue(reduce ? 1 : 0);
  useAnimatedReaction(
    () => interpolate(scrollY.value + viewport.value - (offset.value + y.value), [0, 140], [0, 1], Extrapolation.CLAMP),
    p => { if (p > seen.value) seen.value = p; },
  );
  const anim = useAnimatedStyle(() => ({ opacity: seen.value, transform: [{ translateY: (1 - seen.value) * spacing.xl }] }));
  return <Animated.View style={[style, anim]} onLayout={e => { y.value = e.nativeEvent.layout.y; }}>{children}</Animated.View>;
}

/** Valor viejo que se tacha en vivo */
export function Strike({ children, style, delay = 250 }) {
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? 1 : 0);
  useEffect(() => { if (!reduce) p.value = withDelay(delay, withTiming(1, { duration: 450, easing: Easing.out(Easing.quad) })); }, []);
  const line = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={styles.strikeWrap}>
      <Text style={style}>{children}</Text>
      <Animated.View pointerEvents="none" style={[styles.strike, line]} />
    </View>
  );
}

/** Valor nuevo que destella una vez (verde si mejora, rojo si empeora) */
export function Flash({ children, style, tone, delay = 600 }) {
  const reduce = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => { if (!reduce) p.value = withDelay(delay, withSequence(withTiming(1, { duration: 220 }), withTiming(0, { duration: 700 }))); }, []);
  const anim = useAnimatedStyle(() => ({ color: interpolateColor(p.value, [0, 1], [colors.text, tone || colors.text]), transform: [{ scale: 1 + p.value * 0.05 }] }));
  return <Animated.Text style={[style, anim]}>{children}</Animated.Text>;
}

const styles = StyleSheet.create({
  flex:        { flex: 1 },
  shine:       { position: "absolute", top: 0, bottom: 0, width: "35%" },
  gloss:       { borderRadius: radii.lg, backgroundColor: colors.text },
  chipScroll:  { flexGrow: 0 },
  chipRow:     { gap: spacing.sm, paddingRight: spacing.sm },
  pill:        { position: "absolute", top: 0, bottom: 0, left: 0, borderRadius: radii.pill, borderWidth: sizes.hairline },
  chip:        { flexDirection: "row", alignItems: "center", gap: spacing.xs + spacing.xxs, minHeight: sizes.avatarMd - spacing.xxs, paddingHorizontal: spacing.md, borderRadius: radii.pill, borderWidth: sizes.hairline, borderColor: colors.border, backgroundColor: withAlpha(colors.text, 0.03) },
  chipOn:      { borderColor: "transparent", backgroundColor: "transparent" },
  chipText:    { ...type.smallStrong, color: colors.textSecondary },
  chipTextOn:  { color: colors.text },
  outline:     { position: "absolute", left: -spacing.xs, bottom: -spacing.md },
  skel:        { overflow: "hidden", backgroundColor: withAlpha(colors.text, 0.05) },
  loader:      { alignItems: "center", gap: spacing.xs, paddingVertical: spacing.md },
  loaderText:  { ...type.micro, color: colors.textMuted, letterSpacing: 1.2 },
  ambient:     { position: "absolute", top: -sizes.chart * 1.2, left: "-30%", right: "-30%", height: sizes.chart * 4.2, opacity: 0.55 },
  balance:     { marginTop: spacing.md, padding: spacing.md, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: sizes.hairline, borderColor: colors.border },
  balanceRow:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  balanceText: { ...type.captionStrong },
  balanceTitle:{ ...type.micro, color: colors.textSecondary, flexShrink: 1, textAlign: "center" },
  balanceTrack:{ flexDirection: "row", height: spacing.sm, borderRadius: radii.xs, overflow: "hidden", marginTop: spacing.sm, backgroundColor: withAlpha(colors.text, 0.07), gap: spacing.xxs },
  balanceUp:   { height: "100%", backgroundColor: colors.win },
  balanceDown: { height: "100%", backgroundColor: colors.loss },
  strikeWrap:  { justifyContent: "center" },
  strike:      { position: "absolute", left: 0, height: 1.5, backgroundColor: withAlpha(colors.text, 0.6) },
});
