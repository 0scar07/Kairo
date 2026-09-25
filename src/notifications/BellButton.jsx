import React from "react";
import { StyleSheet } from "react-native";
import { PressableScale } from "../components/ui";
import Icon from "../components/Icon";
import { useT } from "../i18n/I18nProvider";
import { colors, radii, sizes, spacing, withAlpha } from "../theme";

// Campanita de alertas de partida en vivo: rellena con el color de acento cuando están activadas
export default function BellButton({ active, onPress, accent, size = sizes.item - spacing.xs, style }) {
  const t = useT();
  return (
    <PressableScale
      haptic
      scaleTo={0.85}
      onPress={onPress}
      hitSlop={spacing.sm}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={active ? t("notif.alertsOn") : t("notif.alertsOff")}
      style={[styles.button, { backgroundColor: active ? withAlpha(accent, 0.18) : "transparent", borderColor: active ? withAlpha(accent, 0.55) : "transparent" }, style]}
    >
      <Icon name={active ? "bell" : "bellOff"} size={size} color={active ? accent : colors.textMuted} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: { padding: spacing.xs + spacing.xxs, borderRadius: radii.pill, borderWidth: sizes.hairline },
});
