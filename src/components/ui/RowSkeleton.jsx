import React from "react";
import { View, StyleSheet } from "react-native";
import Skeleton from "./Skeleton";
import { colors, radii, sizes, spacing } from "../../theme";

// Esqueleto de una fila de partida (mientras se cargan más)
export default function RowSkeleton() {
  return (
    <View style={styles.row}>
      <Skeleton width={sizes.placement} height={sizes.placement} radius={radii.md} />
      <View style={styles.info}>
        <Skeleton width="35%" height={spacing.md} />
        <Skeleton width="60%" height={spacing.md} />
      </View>
      <View style={styles.right}>
        <Skeleton width={spacing.xxxl + spacing.md} height={spacing.md} />
        <Skeleton width={spacing.xxxl} height={spacing.md} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row:   {
    flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md,
    borderRadius: radii.md, marginBottom: spacing.xs, backgroundColor: colors.surface,
  },
  info:  { flex: 1, gap: spacing.sm },
  right: { alignItems: "flex-end", gap: spacing.sm },
});
