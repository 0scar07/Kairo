import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from "react-native-reanimated";
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
        {items.map((it, i) => <Bar key={i} item={it} index={i} />)}
      </View>
    </Card>
  );
}

// Cada barra aparece con un pequeño salto, una detrás de otra (de la más reciente a la más antigua)
function Bar({ item, index }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withDelay(150 + index * 45, withSpring(1, { damping: 13, stiffness: 220 })); }, []);
  const animated = useAnimatedStyle(() => ({ opacity: Math.min(p.value * 1.5, 1), transform: [{ scaleY: 0.3 + p.value * 0.7 }] }));
  return (
    <Animated.View style={[styles.bar, { backgroundColor: item.color }, animated]}>
      {item.text ? <Text style={styles.text}>{item.text}</Text> : null}
    </Animated.View>
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
