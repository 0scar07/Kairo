import React from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { PressableScale } from "../components/ui";
import Icon from "../components/Icon";
import LiveCapsule from "./LiveCapsule";
import { useNotifications } from "./NotificationsProvider";
import { useT } from "../i18n/I18nProvider";
import { profileIconUrl } from "../api/ddragon";
import { accents, colors, radii, sizes, spacing, fontSizes, lineHeights, type, glow, withAlpha } from "../theme";

/**
 * Hoja propia que explica para qué sirven los avisos ANTES del diálogo del sistema (que solo se pide la primera vez
 * que se toca la campanita de un favorito). Si el permiso está bloqueado, explica cómo activarlo y abre los ajustes.
 */
export default function PermissionSheet() {
  const t = useT();
  const { sheet, confirmSheet, closeSheet, openSystemSettings } = useNotifications();
  const accent = accents.lol;
  const denied = sheet?.mode === "denied";
  const fav = sheet?.fav;

  return (
    <Modal visible={Boolean(sheet)} transparent animationType="fade" onRequestClose={closeSheet} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={closeSheet} accessibilityLabel={t("common.close")} />
      <View style={styles.wrap} pointerEvents="box-none">
        <View style={[styles.sheet, { borderColor: withAlpha(accent, 0.35) }]}>
          <View style={[styles.badge, { backgroundColor: withAlpha(accent, 0.14), borderColor: withAlpha(accent, 0.5) }, glow(accent, spacing.lg, 0.35)]}>
            <Icon name={denied ? "bellOff" : "bell"} size={sizes.avatarMd - spacing.xs} color={accent} />
          </View>

          <Text style={styles.title}>{denied ? t("notif.sheet.deniedTitle") : t("notif.sheet.title")}</Text>
          <Text style={styles.body}>
            {denied ? t("notif.sheet.deniedBody") : t("notif.sheet.body", { name: fav?.gameName || "" })}
          </Text>

          {!denied && (
            <View style={[styles.preview, { borderColor: withAlpha(colors.text, 0.12) }]}>
              <LiveCapsule
                name={fav?.gameName || "Kairo"}
                time={t("notif.now")}
                subtitle={t("notif.banner.sub", { queue: "Ranked Solo", champion: "Ahri" })}
                avatarUri={fav?.iconId != null ? profileIconUrl(fav.iconId) : null}
                accent={accent}
              />
            </View>
          )}

          <PressableScale
            haptic
            onPress={denied ? () => { openSystemSettings(); closeSheet(); } : confirmSheet}
            style={[styles.primary, { backgroundColor: accent }]}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>{denied ? t("notif.openSettings") : t("notif.sheet.allow")}</Text>
          </PressableScale>
          <PressableScale onPress={closeSheet} style={styles.secondary} accessibilityRole="button">
            <Text style={styles.secondaryText}>{denied ? t("common.close") : t("notif.sheet.later")}</Text>
          </PressableScale>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop:      { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
  wrap:          { flex: 1, justifyContent: "flex-end", padding: spacing.lg },
  sheet:         { backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: sizes.hairline, padding: spacing.xl, alignItems: "center", gap: spacing.md },
  badge:         { width: sizes.avatarXl, height: sizes.avatarXl, borderRadius: radii.pill, borderWidth: sizes.hairline, alignItems: "center", justifyContent: "center", marginBottom: spacing.xs },
  title:         { ...type.title, color: colors.text, textAlign: "center" },
  body:          { ...type.body, color: colors.textSecondary, textAlign: "center", lineHeight: lineHeights.relaxed },
  preview:       { alignSelf: "stretch", padding: spacing.md, borderRadius: radii.xl, borderWidth: sizes.hairline, backgroundColor: withAlpha(colors.bg, 0.7), marginVertical: spacing.xs },
  primary:       { alignSelf: "stretch", height: sizes.button, borderRadius: radii.pill, alignItems: "center", justifyContent: "center", marginTop: spacing.xs },
  primaryText:   { ...type.heading, fontSize: fontSizes.base, color: colors.onAccent },
  secondary:     { alignSelf: "stretch", height: sizes.button - spacing.sm, alignItems: "center", justifyContent: "center" },
  secondaryText: { ...type.bodyStrong, fontSize: fontSizes.base, color: colors.textMuted },
});
