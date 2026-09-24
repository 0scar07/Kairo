import React from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors, radii, spacing, sizes, type } from "../../theme";

// Aviso de error; se descarta al tocarlo
export default function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <TouchableOpacity style={styles.banner} onPress={onDismiss} activeOpacity={0.8}>
      <Text style={styles.text}>⚠ {message}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.lossBgStrong, borderWidth: sizes.hairline, borderColor: colors.loss,
    borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.lg,
  },
  text: { ...type.smallStrong, color: colors.loss },
});
