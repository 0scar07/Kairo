import React from "react";
import { View, Text, StyleSheet } from "react-native";
import PressableScale from "./PressableScale";
import { colors, spacing, fontSizes, type } from "../../theme";

// Fila de ajustes: título, pista opcional y un control a la derecha (interruptor, flecha…)
export default function SettingRow({ label, hint, right, onPress, danger, disabled }) {
  const body = (
    <View style={[styles.row, disabled && styles.disabled]}>
      <View style={styles.text}>
        <Text style={[styles.label, danger && { color: colors.loss }]}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {right}
    </View>
  );
  return onPress ? <PressableScale scaleTo={0.985} onPress={onPress} disabled={disabled}>{body}</PressableScale> : body;
}

const styles = StyleSheet.create({
  row:      { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  disabled: { opacity: 0.45 },
  text:     { flex: 1 },
  label:    { ...type.bodyStrong, fontSize: fontSizes.base, color: colors.text },
  hint:     { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
});
