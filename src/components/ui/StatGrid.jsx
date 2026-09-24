import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Card from "./Card";
import SectionLabel from "./SectionLabel";
import { colors, spacing, type, tracking } from "../../theme";

// Tarjeta con estadísticas en cuadrícula: items [{ label, value, color? }], `columns` por fila (3 por defecto).
export default function StatGrid({ label, icon, items, columns = 3 }) {
  return (
    <Card>
      {label ? <SectionLabel icon={icon}>{label}</SectionLabel> : null}
      <View style={styles.grid}>
        {items.map(it => (
          <View key={it.label} style={[styles.cell, { width: `${100 / columns}%` }]}>
            <Text style={[styles.value, { color: it.color || colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{it.value}</Text>
            <Text style={styles.label} numberOfLines={1}>{it.label.toUpperCase()}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  grid:  { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.md },
  cell:  { alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.xs },
  value: { ...type.stat },
  label: { ...type.micro, color: colors.textMuted, letterSpacing: tracking.wide },
});
