import React from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";
import Icon from "../Icon";
import { colors, radii, spacing, sizes, fontSizes, type } from "../../theme";

// Aviso de error; se descarta al tocarlo
export default function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <TouchableOpacity style={styles.banner} onPress={onDismiss} activeOpacity={0.8}>
      <Icon name="alert" size={fontSizes.base} color={colors.loss} />
      <Text style={styles.text}>{message}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.lossBgStrong, borderWidth: sizes.hairline, borderColor: colors.loss,
    borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.lg,
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
  },
  text: { flex: 1, ...type.smallStrong, color: colors.loss },
});
