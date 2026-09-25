import React, { useEffect } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LiveDot, PressableScale } from "../components/ui";
import Icon from "../components/Icon";
import { useT } from "../i18n/I18nProvider";
import { profileIconUrl } from "../api/ddragon";
import { queueLabel } from "../games/lol/utils";
import { accents, colors, radii, sizes, spacing, fontSizes, type, withAlpha } from "../theme";

/**
 * Indicador persistente: una mini cápsula arriba a la derecha con el punto rojo, el ícono de perfil y "N en vivo".
 * Aparece cuando algún favorito con alertas está en partida y desaparece cuando ninguno lo está.
 */
export function LiveIndicator({ live, hidden, onPress }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const shown = live.length > 0 && !hidden;
  const p = useSharedValue(0);
  useEffect(() => { p.value = withSpring(shown ? 1 : 0, { damping: 13, stiffness: 190, mass: 0.8 }); }, [shown]);
  const style = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: 0.6 + 0.4 * p.value }, { translateY: -12 * (1 - p.value) }] }));
  if (live.length === 0) return null;
  const accent = accents.lol;
  const first = live[0];

  return (
    <Animated.View pointerEvents={shown ? "box-none" : "none"} style={[styles.wrap, { top: insets.top + 6 }, style]}>
      <PressableScale onPress={onPress} haptic style={[styles.pill, { borderColor: withAlpha(accent, 0.4) }]} accessibilityRole="button" accessibilityLabel={t("notif.liveNow")}>
        <LiveDot size={sizes.dot + 1} />
        {first.iconId != null ? <Image source={{ uri: profileIconUrl(first.iconId) }} style={styles.avatar} /> : null}
        <Text style={styles.label}>{t("notif.liveCount", { count: live.length })}</Text>
      </PressableScale>
    </Animated.View>
  );
}

// Lista de favoritos en partida (al tocar el indicador)
export function LiveListSheet({ visible, live, onClose, onOpen }) {
  const t = useT();
  const accent = accents.lol;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t("common.close")} />
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <View style={[styles.sheet, { borderColor: withAlpha(accent, 0.35) }]}>
          <Text style={styles.title}>{t("notif.liveNow")}</Text>
          {live.map(l => (
            <PressableScale key={l.puuid} onPress={() => onOpen(l)} haptic style={styles.row}>
              {l.iconId != null ? <Image source={{ uri: profileIconUrl(l.iconId) }} style={styles.rowAvatar} /> : <View style={styles.rowAvatar} />}
              <View style={styles.rowText}>
                <Text style={styles.rowName} numberOfLines={1}>{l.name}</Text>
                <View style={styles.rowStatus}>
                  <LiveDot size={sizes.dot} />
                  <Text style={styles.rowSub} numberOfLines={1}>{l.queueId != null ? queueLabel(l.queueId) : t("live.badge")}</Text>
                </View>
              </View>
              <Icon name="chevron" size={sizes.item - spacing.xs} color={colors.textMuted} />
            </PressableScale>
          ))}
          <PressableScale onPress={onClose} style={styles.close}>
            <Text style={styles.closeText}>{t("common.close")}</Text>
          </PressableScale>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap:      { position: "absolute", right: spacing.lg, zIndex: 40, elevation: 40 },
  pill:      {
    flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: spacing.xs, paddingLeft: spacing.sm, paddingRight: spacing.md,
    borderRadius: radii.pill, borderWidth: sizes.hairline, backgroundColor: "rgba(14, 23, 30, 0.92)",
  },
  avatar:    { width: sizes.item - spacing.xs, height: sizes.item - spacing.xs, borderRadius: radii.pill },
  label:     { ...type.smallStrong, color: colors.text },
  backdrop:  { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
  sheetWrap: { flex: 1, justifyContent: "flex-end", padding: spacing.lg },
  sheet:     { backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: sizes.hairline, padding: spacing.lg, gap: spacing.sm },
  title:     { ...type.heading, color: colors.text, marginBottom: spacing.xs, paddingHorizontal: spacing.xs },
  row:       { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.sm, borderRadius: radii.lg, backgroundColor: withAlpha(colors.text, 0.04) },
  rowAvatar: { width: sizes.avatarLg, height: sizes.avatarLg, borderRadius: radii.pill, backgroundColor: colors.surfaceHigh },
  rowText:   { flex: 1, gap: spacing.xxs },
  rowName:   { ...type.bodyStrong, fontSize: fontSizes.base, color: colors.text },
  rowStatus: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  rowSub:    { ...type.small, color: colors.textSecondary },
  close:     { alignItems: "center", justifyContent: "center", height: sizes.button - spacing.sm, marginTop: spacing.xs },
  closeText: { ...type.bodyStrong, fontSize: fontSizes.base, color: colors.textMuted },
});
