import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Card, Skeleton, RowSkeleton } from "./ui";
import { colors, radii, sizes, spacing } from "../theme";

// Esqueleto del perfil mientras se descargan los datos: cabecera, rangos, resumen y partidas
export default function ProfileSkeleton() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} scrollEnabled={false}>
      <Card style={styles.header}>
        <Skeleton width={sizes.iconHero} height={sizes.iconHero} radius={radii.pill} />
        <View style={styles.headerInfo}>
          <Skeleton width="60%" height={spacing.xl} />
          <Skeleton width="30%" height={spacing.md} />
          <Skeleton width="45%" height={spacing.xl} radius={radii.pill} />
        </View>
      </Card>

      <View style={styles.ranked}>
        <Skeleton height={sizes.iconHero + spacing.xxl} radius={radii.lg} style={styles.flex} />
        <Skeleton height={sizes.iconHero + spacing.xxl} radius={radii.lg} style={styles.flex} />
      </View>

      <Skeleton height={sizes.iconHero} radius={radii.lg} style={styles.block} />
      <Skeleton height={sizes.button} radius={radii.md} style={styles.block} />
      {[0, 1, 2, 3].map(i => <RowSkeleton key={i} />)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.bg },
  content:    { padding: spacing.lg },
  header:     { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  headerInfo: { flex: 1, gap: spacing.sm },
  ranked:     { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  flex:       { flex: 1 },
  block:      { marginBottom: spacing.lg },
});
