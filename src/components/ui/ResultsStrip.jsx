import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Card from "./Card";
import SectionLabel from "./SectionLabel";
import { colors, radii, sizes, spacing, type } from "../../theme";

/**
 * Mini gráfico de resultados recientes: una barra por partida (la más reciente a la izquierda).
 * items: [{ color, text? }]. `summary` es un texto corto a la derecha del título ("6V · 4D").
 */
export default function ResultsStrip({ label, summary, items }) {
  if (!items?.length) return null;
  return (
    <Card>
      <View style={styles.header}>
        <SectionLabel style={styles.label}>{label}</SectionLabel>
        {summary ? <Text style={styles.summary}>{summary}</Text> : null}
      </View>
      <View style={styles.row}>
        {items.map((it, i) => (
          <View key={i} style={[styles.bar, { backgroundColor: it.color }]}>
            {it.text ? <Text style={styles.text}>{it.text}</Text> : null}
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  label:   { marginBottom: 0 },
  summary: { ...type.smallStrong, color: colors.textSecondary },
  row:     { flexDirection: "row", gap: spacing.xs },
  bar:     {
    flex: 1, height: sizes.avatarSm, borderRadius: radii.sm,
    alignItems: "center", justifyContent: "center",
  },
  text:    { ...type.label, color: colors.onAccent },
});
