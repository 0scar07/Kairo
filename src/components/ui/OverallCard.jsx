import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Card from "./Card";
import SectionLabel from "./SectionLabel";
import ProgressBar from "./ProgressBar";
import { colors, spacing, sizes, type, tracking } from "../../theme";

// Tarjeta de resumen: bloques [{ title, sub, value, color, node }] separados por líneas,
// con una barra opcional (bar = { value, color }) debajo.
export default function OverallCard({ label, blocks, bar }) {
  return (
    <Card>
      <SectionLabel style={styles.label}>{label}</SectionLabel>
      <View style={styles.row}>
        {blocks.map((b, i) => (
          <React.Fragment key={b.title}>
            {i > 0 && <View style={styles.divider} />}
            <View style={styles.block}>
              {b.node || <Text style={[styles.value, { color: b.color || colors.text }]}>{b.value}</Text>}
              <Text style={styles.sub}>{b.sub}</Text>
              <Text style={styles.title}>{b.title}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
      {bar && <ProgressBar value={bar.value} color={bar.color} glowing style={styles.bar} />}
    </Card>
  );
}

const styles = StyleSheet.create({
  label:   { marginBottom: spacing.md },
  row:     { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  block:   { alignItems: "center", gap: spacing.xs },
  value:   { ...type.statLarge },
  sub:     { ...type.caption, color: colors.textSecondary },
  title:   { ...type.label, color: colors.textMuted, letterSpacing: tracking.wide },
  divider: { width: sizes.hairline, height: sizes.avatarLg + spacing.sm, backgroundColor: colors.border },
  bar:     { marginTop: spacing.md },
});
