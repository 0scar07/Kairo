import React from "react";
import { useT } from "../../i18n/I18nProvider";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import PressableScale from "./PressableScale";
import { colors, sizes, spacing, type, fontSizes, tracking, useAccent } from "../../theme";

/**
 * Cabecera de perfil a todo el ancho (sin tarjeta): avatar y acciones arriba, nombre grande, #tag y el rango
 * en el color del tier. Si hay `emblem` (el emblema de rango), va grande a la derecha como "retrato" del jugador.
 *  - badge / badgeDetail: rango y dato al lado ("Challenger" · "2256 LP"); badgeIcon solo se usa sin emblema
 */
export default function ProfileHeader({
  avatar, name, tag, badge, badgeDetail, badgeIcon, emblem, subtitle, game, glowColor, action, onAction, extraAction,
}) {
  const t = useT();
  const accent = useAccent(game);
  const tint = glowColor || accent;

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <View>{avatar}</View>
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

const EMBLEM = sizes.iconHero + spacing.lg;
const LIGHT = EMBLEM * 2;

const styles = StyleSheet.create({
  wrap:      { marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
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
