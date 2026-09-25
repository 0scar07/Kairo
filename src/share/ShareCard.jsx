import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";
import RankEmblem from "../components/RankEmblem";
import { getGame } from "../games";
import { useT } from "../i18n/I18nProvider";
import { tierLabel } from "../utils/format";
import { accents, colors, fonts, radii, spacing, tracking, withAlpha } from "../theme";

export const CARD_W = 360;
export const CARD_H = 450;   // 4:5, como una publicación de Instagram; se captura a 3x (1080 x 1350)

/**
 * Tarjeta para compartir un perfil como imagen: marca, jugador con su rango y hasta tres estadísticas del juego
 * (`game.shareStats(data, t)` -> [{ label, value }]). Es genérica: sirve para cualquier juego que tenga `getProfile`.
 */
export default function ShareCard({ gameId, data }) {
  const t = useT();
  const game = getGame(gameId);
  const accent = game.accent || accents.brand;
  const profile = game.getProfile(data);
  const ranked = profile.ranked;
  const tint = colors.tier[ranked?.tier] || accent;
  const badge = ranked ? tierLabel(ranked.tier, ranked.rank) : profile.badge || null;
  const stats = (game.shareStats ? game.shareStats(data, t) : []).slice(0, 3);

  return (
    <View style={styles.card} collapsable={false}>
      <Svg width={CARD_W} height={CARD_H} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="36%" r="62%">
            <Stop offset="0" stopColor={tint} stopOpacity="0.34" />
            <Stop offset="1" stopColor={colors.bg} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width={CARD_W} height={CARD_H} fill={colors.bg} />
        <Rect width={CARD_W} height={CARD_H} fill="url(#glow)" />
      </Svg>

      <Text style={[styles.brand, { color: accents.brand }]}>KAIRO</Text>
      <Text style={styles.gameName}>{game.name.toUpperCase()}</Text>

      <View style={styles.center}>
        <View style={[styles.avatar, { borderColor: withAlpha(tint, 0.5) }]}>{profile.avatar}</View>
        <Text style={styles.name} numberOfLines={1}>{profile.name}</Text>
        {profile.tag ? <Text style={styles.tag}>#{profile.tag}</Text> : null}
        {badge ? (
          <View style={[styles.badge, { backgroundColor: withAlpha(tint, 0.16), borderColor: withAlpha(tint, 0.5) }]}>
            {ranked ? <RankEmblem tier={ranked.tier} size={26} /> : profile.badgeIcon}
            <Text style={[styles.badgeText, { color: tint }]}>{badge}</Text>
          </View>
        ) : null}
      </View>

      {stats.length ? (
        <View style={styles.stats}>
          {stats.map(s => (
            <View key={s.label} style={styles.stat}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.footer}>{t("app.tagline")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card:      { width: CARD_W, height: CARD_H, backgroundColor: colors.bg, overflow: "hidden", padding: spacing.xl, alignItems: "center" },
  brand:     { fontFamily: fonts.displayHeavy, fontSize: 20, letterSpacing: tracking.brand },
  gameName:  { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: tracking.wider, color: colors.textMuted, marginTop: spacing.xs },
  center:    { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.xs },
  avatar:    { borderRadius: radii.pill, borderWidth: 3, padding: 3, marginBottom: spacing.sm },
  name:      { fontFamily: fonts.displayHeavy, fontSize: 28, color: colors.text, maxWidth: CARD_W - 60 },
  tag:       { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  badge:     { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginTop: spacing.md },
  badgeText: { fontFamily: fonts.displaySemi, fontSize: 15, letterSpacing: tracking.wide },
  stats:     { flexDirection: "row", alignSelf: "stretch", justifyContent: "space-around", paddingVertical: spacing.lg, borderTopWidth: 1, borderColor: withAlpha(colors.text, 0.1) },
  stat:      { alignItems: "center", gap: 2 },
  statValue: { fontFamily: fonts.displayHeavy, fontSize: 22, color: colors.text },
  statLabel: { fontFamily: fonts.bodyMedium, fontSize: 10, letterSpacing: tracking.wide, color: colors.textMuted, textTransform: "uppercase" },
  footer:    { fontFamily: fonts.bodyMedium, fontSize: 11, letterSpacing: tracking.wide, color: colors.textFaint, marginTop: spacing.md },
});
