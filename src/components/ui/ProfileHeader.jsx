import React, { useEffect, useState } from "react";
import { useT } from "../../i18n/I18nProvider";
import { View, Text, Image, StyleSheet } from "react-native";
import Animated, { FadeIn, ReduceMotion, ZoomIn, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";
import PressableScale from "./PressableScale";
import { colors, sizes, spacing, type, fontSizes, tracking, useAccent } from "../../theme";

/**
 * Cabecera de perfil a todo el ancho (sin tarjeta): avatar y acciones arriba, nombre grande, #tag y el rango
 * en el color del tier. Si hay `emblem` (el emblema de rango), va grande a la derecha como "retrato" del jugador.
 *  - badge / badgeDetail: rango y dato al lado ("Challenger" · "2256 LP"); badgeIcon solo se usa sin emblema
 *  - backdrop: { uri, fallback } arte de fondo (en LoL, el del campeón que más juega); entra con un fundido corto
 */
export default function ProfileHeader({
  avatar, name, tag, badge, badgeDetail, badgeIcon, emblem, subtitle, game, glowColor, action, onAction, extraAction, backdrop,
}) {
  const t = useT();
  const accent = useAccent(game);
  const tint = glowColor || accent;
  const reduce = useReducedMotion();

  return (
    <View style={[styles.wrap, backdrop && styles.wrapArt]}>
      {backdrop ? <Backdrop art={backdrop} /> : null}
      <View style={styles.top}>
        <Animated.View entering={reduce ? FadeIn.duration(200).reduceMotion(ReduceMotion.Never) : ZoomIn.duration(220)}>{avatar}</Animated.View>
        {action || extraAction ? (
          <View style={styles.actions}>
            {extraAction || null}
            {action ? (
              <PressableScale onPress={onAction} haptic scaleTo={0.85} hitSlop={spacing.xs} style={styles.action} accessibilityLabel={t("favorites.favorite")}>
                {typeof action === "string" ? <Text style={styles.actionText}>{action}</Text> : action}
              </PressableScale>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.bottom}>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2} accessibilityRole="header">{name}</Text>
          {tag ? <Text style={styles.tag}>#{tag}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {badge ? (
            <View style={styles.rank}>
              {!emblem && badgeIcon ? badgeIcon : null}
              <Text style={[styles.badge, { color: tint }]} numberOfLines={1}>{badge}</Text>
              {badgeDetail ? <Text style={styles.detail}>{badgeDetail}</Text> : null}
            </View>
          ) : null}
        </View>
        {emblem ? (
          <View style={styles.emblem} pointerEvents="none">
            {/* Luz suave del color del rango detrás del emblema (se desvanece en círculo, sin bordes) */}
            <Svg width={LIGHT} height={LIGHT} style={styles.light}>
              <Defs>
                <RadialGradient id="phLight" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={tint} stopOpacity="0.22" />
                  <Stop offset="1" stopColor={tint} stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect x="0" y="0" width={LIGHT} height={LIGHT} fill="url(#phLight)" />
            </Svg>
            {emblem}
          </View>
        ) : null}
      </View>
    </View>
  );
}

// Arte de fondo: la imagen entra con un fundido de 250 ms y una capa oscura (de arriba a abajo y desde la izquierda,
// donde va el texto) mantiene el nombre y el rango legibles sobre cualquier splash
function Backdrop({ art }) {
  const [uri, setUri] = useState(art.uri);
  const shown = useSharedValue(0);
  useEffect(() => { setUri(art.uri); shown.value = 0; }, [art.uri]);
  const fade = useAnimatedStyle(() => ({ opacity: shown.value }));
  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, fade]} pointerEvents="none">
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onLoad={() => { shown.value = withTiming(1, { duration: 250, reduceMotion: ReduceMotion.Never }); }}
          onError={() => { if (art.fallback && uri !== art.fallback) setUri(art.fallback); }}
          accessibilityIgnoresInvertColors
        />
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <LinearGradient id="phShadeV" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.bg} stopOpacity="0.5" />
              <Stop offset="0.5" stopColor={colors.bg} stopOpacity="0.72" />
              <Stop offset="1" stopColor={colors.bg} stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="phShadeH" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={colors.bg} stopOpacity="0.7" />
              <Stop offset="0.75" stopColor={colors.bg} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#phShadeV)" />
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#phShadeH)" />
        </Svg>
      </Animated.View>
    </>
  );
}

const EMBLEM = sizes.iconHero + spacing.lg;
const LIGHT = EMBLEM * 2;

const styles = StyleSheet.create({
  wrap:      { marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  wrapArt:   { marginTop: -spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl, overflow: "hidden" },
  top:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  actions:   { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  action:    { padding: spacing.sm },
  actionText:{ fontSize: fontSizes.xxl },
  bottom:    { flexDirection: "row", alignItems: "flex-end" },
  info:      { flex: 1, minWidth: 0 },
  name:      { ...type.largeTitle, fontFamily: type.brand.fontFamily, fontSize: fontSizes.xxxl, letterSpacing: tracking.tighter, color: colors.text },
  tag:       { ...type.body, color: colors.textMuted, marginTop: spacing.xxs },
  subtitle:  { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
  rank:      { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md, flexWrap: "wrap" },
  badge:     { ...type.title, fontSize: fontSizes.xl - spacing.xxs },
  detail:    { ...type.bodyMedium, fontSize: fontSizes.base, color: colors.textSecondary, fontVariant: ["tabular-nums"] },
  emblem:    { width: EMBLEM, height: EMBLEM, marginLeft: spacing.sm, marginRight: -spacing.sm, alignItems: "center", justifyContent: "center" },
  light:     { position: "absolute", left: (EMBLEM - LIGHT) / 2, top: (EMBLEM - LIGHT) / 2 },
});
