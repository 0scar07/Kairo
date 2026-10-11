import React, { useEffect } from "react";
import { useT } from "../../i18n/I18nProvider";
import { View, Text, StyleSheet } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";
import Card from "./Card";
import PressableScale from "./PressableScale";
import { colors, radii, sizes, spacing, type, fontSizes, glow, useAccent, withAlpha } from "../../theme";

// Cabecera de perfil: avatar grande con resplandor del color del rango + nombre#tag + insignia + acción
export default function ProfileHeader({
  avatar, name, tag, badge, badgeIcon, subtitle, game, glowColor, action, onAction, extraAction, avatarSize,
}) {
  const t = useT();
  const accent = useAccent(game);
  const tint = glowColor || accent;
  // El halo del avatar entra una sola vez (sin bucles: es movimiento periférico)
  const halo = useSharedValue(0);
  useEffect(() => { halo.value = withDelay(200, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })); }, []);
  const haloStyle = useAnimatedStyle(() => ({ opacity: halo.value, transform: [{ scale: 0.85 + halo.value * 0.15 }] }));

  return (
    <Card style={[styles.card, { borderColor: withAlpha(tint, 0.35), backgroundColor: colors.surface }]}>
      {/* Degradado del color del rango: más intenso detrás del avatar */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="phLinear" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={tint} stopOpacity="0.16" />
            <Stop offset="1" stopColor={tint} stopOpacity="0.02" />
          </LinearGradient>
          <RadialGradient id="phRadial" cx="18%" cy="50%" r="45%">
            <Stop offset="0" stopColor={tint} stopOpacity="0.28" />
            <Stop offset="1" stopColor={tint} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#phLinear)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#phRadial)" />
      </Svg>
      <View style={styles.avatarWrap}>
        <Animated.View pointerEvents="none" style={[styles.halo, { borderColor: withAlpha(tint, 0.55) }, haloStyle]} />
        <View style={[styles.avatar, avatarSize && { borderRadius: avatarSize / 2 }, glow(tint, spacing.xl, 0.5)]}>{avatar}</View>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        {tag ? <Text style={styles.tag}>#{tag}</Text> : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {badge ? (
          <View style={[styles.badge, { backgroundColor: withAlpha(tint, 0.14), borderColor: withAlpha(tint, 0.4) }]}>
            {badgeIcon}
            <Text style={[styles.badgeText, { color: tint }]}>{badge}</Text>
          </View>
        ) : null}
      </View>
      {action || extraAction ? (
        <View style={styles.actions}>
          {action ? (
            <PressableScale onPress={onAction} haptic scaleTo={0.85} style={styles.action} accessibilityLabel={t("favorites.favorite")}>
              {typeof action === "string" ? <Text style={styles.actionText}>{action}</Text> : action}
            </PressableScale>
          ) : null}
          {extraAction || null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card:      { flexDirection: "row", alignItems: "center", overflow: "hidden" },
  avatarWrap:{ alignItems: "center", justifyContent: "center" },
  halo:      { position: "absolute", top: -spacing.sm, bottom: -spacing.sm, left: -spacing.sm, right: -spacing.sm, borderRadius: radii.pill, borderWidth: sizes.borderThick },
  avatar:    { borderRadius: radii.pill },
  info:      { marginLeft: spacing.lg, flex: 1 },
  name:      { ...type.title, color: colors.text },
  tag:       { ...type.small, color: colors.textMuted },
  subtitle:  { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
  badge:     {
    marginTop: spacing.sm, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: spacing.xs, borderWidth: sizes.hairline,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill,
  },
  badgeText: { ...type.smallStrong },
  actions:   { alignItems: "center", gap: spacing.xs },
  action:    { padding: spacing.sm },
  actionText:{ fontSize: fontSizes.xxl },
});
