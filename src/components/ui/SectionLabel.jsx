import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Icon from "../Icon";
import { colors, spacing, fontSizes, type, tracking } from "../../theme";

// icon: nombre de un ícono de Icon.jsx; iconColor por defecto es el color del texto
export default function SectionLabel({ children, style, icon, iconColor = colors.textMuted }) {
  // Los hijos pueden ser varios (texto + variables): se unen sin separadores
  const text = React.Children.toArray(children).join("").toUpperCase();
  if (!icon) return <Text style={[styles.label, style]}>{text}</Text>;
  return (
    <View style={[styles.row, style]}>
      <Icon name={icon} size={fontSizes.base} color={iconColor} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const textStyle = { ...type.label, color: colors.textMuted, letterSpacing: tracking.wider };

const styles = StyleSheet.create({
  label: { ...textStyle, marginBottom: spacing.sm },
  row:   { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  text:  textStyle,
});
