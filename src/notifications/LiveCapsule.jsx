import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { LiveDot } from "../components/ui";
import GameLogo from "../components/GameLogo";
import { colors, sizes, spacing, fontSizes, type, withAlpha } from "../theme";

/**
 * Contenido de la cápsula de "partida en vivo": ícono de perfil con el campeón que juega como insignia, Riot ID con la
 * hora, y el estado con el punto rojo pulsando. Es solo el contenido; el vidrio y la animación los pone quien lo use
 * (FluidBanner, la vista previa del permiso…).
 */
// live=false (resultado de una partida ya terminada): sin el punto rojo
export default function LiveCapsule({ name, time, subtitle, avatarUri, badgeUri, accent, live = true, avatarSize = sizes.avatarLg + spacing.xs }) {
  return (
    <View style={styles.row}>
      <View style={{ width: avatarSize, height: avatarSize }}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, borderColor: withAlpha(colors.text, 0.18) }]} />
        ) : (
          <View style={[styles.avatar, styles.avatarEmpty, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
            <GameLogo game="lol" size={sizes.item} color={accent} />
          </View>
        )}
        {badgeUri ? (
          <Image source={{ uri: badgeUri }} style={[styles.badge, { borderColor: accent }]} />
        ) : null}
      </View>
      <View style={styles.text}>
        <View style={styles.top}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {time ? <Text style={styles.time} numberOfLines={1}>{time}</Text> : null}
        </View>
        <View style={styles.status}>
          {live ? <LiveDot size={sizes.dot + 2} /> : null}
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        </View>
      </View>
    </View>
  );
}

const BADGE = sizes.avatarXs;

const styles = StyleSheet.create({
  row:         { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar:      { borderWidth: sizes.borderThick, backgroundColor: colors.bg },
  avatarEmpty: { alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceHigh },
  badge:       {
    position: "absolute", right: -spacing.xs, bottom: -spacing.xs, width: BADGE, height: BADGE, borderRadius: BADGE / 2,
    borderWidth: sizes.borderThick, backgroundColor: colors.bg,
  },
  text:        { flex: 1, gap: spacing.xxs },
  top:         { flexDirection: "row", alignItems: "baseline", gap: spacing.sm },
  name:        { ...type.bodyStrong, fontSize: fontSizes.base, color: colors.text, flexShrink: 1 },
  time:        { ...type.caption, color: colors.textMuted },
  status:      { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  subtitle:    { ...type.small, color: colors.textSecondary, flex: 1 },
});
