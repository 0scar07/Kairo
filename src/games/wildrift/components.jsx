import React, { useState } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import PressableScale from "../../components/ui/PressableScale";
import { colors, radii, sizes, spacing, type, fontSizes, withAlpha } from "../../theme";

// Piezas visuales del apartado de Wild Rift: arte de campeón con fundido, insignia de tier, escudo de equipo y
// tarjeta de partido en vivo. Comparten el estilo del resto de Kairo (tokens del tema, sin valores sueltos).

let shadeId = 0;
/** Fundido vertical hacia el fondo, para leer texto sobre un splash */
export function Shade({ from = 0, to = 0.92, color = colors.bg }) {
  const [id] = useState(() => `wrShade${++shadeId}`);
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={from} />
          <Stop offset="1" stopColor={color} stopOpacity={to} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/** Tarjeta con arte de fondo (splash) y su contenido abajo */
export function ArtTile({ uri, onPress, style, children, label }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.97} haptic style={[styles.tile, style]} accessibilityRole="button" accessibilityLabel={label}>
      {uri ? <Image source={{ uri }} style={[StyleSheet.absoluteFill, styles.tileArt]} resizeMode="cover" /> : null}
      <Shade from={0.05} to={0.95} />
      <View style={styles.tileBody}>{children}</View>
    </PressableScale>
  );
}

/** Insignia del tier (S+, S, A…) con su color */
export function TierBadge({ tier, size = "md", style }) {
  const bg = colors.wrTier[tier] || colors.textMuted;
  const big = size === "lg";
  const small = size === "sm";
  return (
    <View style={[styles.tier, big && styles.tierLg, small && styles.tierSm, { backgroundColor: bg }, style]}>
      <Text style={[styles.tierText, big && styles.tierTextLg, small && styles.tierTextSm]}>{tier || "—"}</Text>
    </View>
  );
}

/** Escudo de un equipo: su logo si lo hay, o sus siglas sobre un color derivado del nombre */
const CREST = [colors.info, colors.orange, colors.win, colors.loss, colors.tier.MASTER, colors.tier.PLATINUM];
export function TeamCrest({ team, size = sizes.avatarMd }) {
  const tone = CREST[[...(team?.name || "?")].reduce((n, ch) => n + ch.charCodeAt(0), 0) % CREST.length];
  const box = { width: size, height: size, borderRadius: size * 0.3 };
  if (team?.image) {
    return <View style={[styles.crest, box]}><Image source={{ uri: team.image }} style={{ width: size * 0.78, height: size * 0.78 }} resizeMode="contain" /></View>;
  }
  return (
    <View style={[styles.crest, box, { backgroundColor: withAlpha(tone, 0.85) }]}>
      <Text style={[styles.crestText, { fontSize: size * 0.32 }]}>{(team?.acronym || team?.name || "?").slice(0, 3).toUpperCase()}</Text>
    </View>
  );
}

/** Marcador de un partido: equipos a los lados y el resultado al centro */
export function MatchRow({ match, compact }) {
  const [a, b] = match.teams;
  const crest = compact ? sizes.avatarSm : sizes.avatarLg + spacing.sm;
  return (
    <View style={styles.vs}>
      <View style={[styles.side, compact && styles.sideRow]}>
        <TeamCrest team={a} size={crest} />
        <Text style={[styles.teamName, compact && styles.teamNameCompact]} numberOfLines={1}>{a?.name || "?"}</Text>
      </View>
      <Text style={[styles.score, compact && styles.scoreCompact]}>{a?.score ?? 0}:{b?.score ?? 0}</Text>
      <View style={[styles.side, compact && styles.sideRowEnd]}>
        <TeamCrest team={b} size={crest} />
        <Text style={[styles.teamName, compact && styles.teamNameCompact]} numberOfLines={1}>{b?.name || "?"}</Text>
      </View>
    </View>
  );
}

/** Retrato de un campeón con su tier (opcional) y un texto debajo; al tocarlo abre su ficha */
export function Portrait({ uri, tier, label, sub, subColor, onPress, size = sizes.avatarLg + spacing.sm }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.92} haptic style={[styles.portrait, { width: size + spacing.md }]} accessibilityRole="button" accessibilityLabel={label}>
      <View>
        {uri ? <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radii.md }} /> : <View style={{ width: size, height: size, borderRadius: radii.md, backgroundColor: colors.surfaceHigh }} />}
        {tier ? <TierBadge tier={tier} size="sm" style={styles.portraitTier} /> : null}
      </View>
      <Text style={styles.portraitName} numberOfLines={1}>{label}</Text>
      {sub ? <Text style={[styles.portraitSub, subColor && { color: subColor }]} numberOfLines={1}>{sub}</Text> : null}
    </PressableScale>
  );
}

/** Etiqueta roja de "En vivo" */
export function LiveTag({ text }) {
  return (
    <View style={styles.live}>
      <View style={styles.liveDot} />
      <Text style={styles.liveText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile:      { overflow: "hidden", borderRadius: radii.xl, backgroundColor: colors.surfaceRaised, justifyContent: "flex-end" },
  tileArt:   { width: "100%", height: "100%" },
  tileBody:  { padding: spacing.md },
  tier:      { minWidth: sizes.item + spacing.sm, height: sizes.item, paddingHorizontal: spacing.sm, borderRadius: radii.sm, alignItems: "center", justifyContent: "center" },
  tierLg:    { minWidth: sizes.avatarMd + spacing.sm, height: sizes.avatarSm, borderRadius: radii.md },
  tierText:  { ...type.captionStrong, color: colors.onAccent },
  tierTextLg:{ ...type.bodyStrong, color: colors.onAccent },
  tierSm:    { minWidth: sizes.item, height: spacing.lg + spacing.xxs, paddingHorizontal: spacing.xs, borderRadius: radii.xs },
  tierTextSm:{ ...type.micro, color: colors.onAccent },
  crest:     { alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceHigh },
  crestText: { ...type.captionStrong, color: colors.text },
  vs:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  side:      { width: sizes.iconHero + spacing.md, alignItems: "center", gap: spacing.sm },
  sideRow:   { width: "auto", flex: 1, flexDirection: "row" },
  sideRowEnd:{ width: "auto", flex: 1, flexDirection: "row-reverse" },
  teamName:  { ...type.bodyStrong, color: colors.text, textAlign: "center" },
  teamNameCompact: { ...type.smallStrong, flexShrink: 1 },
  score:     { ...type.statLarge, fontSize: fontSizes.hero, color: colors.text, fontVariant: ["tabular-nums"] },
  scoreCompact: { ...type.heading, marginHorizontal: spacing.sm, fontVariant: ["tabular-nums"] },
  portrait:  { alignItems: "center" },
  portraitTier: { position: "absolute", bottom: -spacing.xs, right: -spacing.xs },
  portraitName: { ...type.micro, color: colors.text, marginTop: spacing.xs, maxWidth: "100%" },
  portraitSub:  { ...type.micro, color: colors.textSecondary, fontVariant: ["tabular-nums"] },
  live:      { flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start", backgroundColor: colors.loss, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  liveDot:   { width: sizes.dot, height: sizes.dot, borderRadius: sizes.dot / 2, backgroundColor: colors.text },
  liveText:  { ...type.micro, color: colors.text, letterSpacing: 0.8 },
});
