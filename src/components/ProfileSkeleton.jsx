import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Card, Skeleton, RowSkeleton } from "./ui";
import { colors, radii, sizes, spacing } from "../theme";

const EMBLEM = sizes.iconHero + spacing.lg;   // el mismo hueco que el emblema de ProfileHeader

/**
 * Esqueleto del perfil mientras se descargan los datos, con la misma forma que el perfil real para que nada salte al
 * llegar los datos: la cabecera (avatar y acciones arriba, nombre, #tag y rango, emblema a la derecha) y, en LoL, las
 * dos colas, la maestría y el título de las partidas. Los demás juegos llevan una cuadrícula de cifras.
 */
export default function ProfileSkeleton({ gameId }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} scrollEnabled={false}>
      <View style={styles.top}>
        <Skeleton width={sizes.avatarXl} height={sizes.avatarXl} radius={radii.pill} />
        <View style={styles.actions}>
          <Skeleton width={sizes.item} height={sizes.item} radius={radii.pill} />
          <Skeleton width={sizes.item} height={sizes.item} radius={radii.pill} />
        </View>
      </View>
      <View style={styles.bottom}>
        <View style={styles.info}>
          <Skeleton width="55%" height={spacing.xxl - spacing.xxs} />
          <Skeleton width="22%" height={spacing.md + spacing.xxs} />
          <Skeleton width="70%" height={spacing.xl - spacing.xxs} />
        </View>
        <Skeleton width={EMBLEM - spacing.xl} height={EMBLEM - spacing.xxl} radius={radii.xl} style={styles.emblem} />
      </View>
      <Skeleton width="32%" height={spacing.md - spacing.xxs} style={styles.updated} />

      {gameId === "lol" ? <LolBody /> : <GenericBody />}
    </ScrollView>
  );
}

// Columna de una cola: etiqueta, división, LP, récord, "mejor winrate" y sus tres campeones
function QueueColumn({ right }) {
  return (
    <View style={[styles.col, right && styles.colRight]}>
      <Skeleton width="45%" height={spacing.md - spacing.xxs} />
      <Skeleton width="80%" height={spacing.lg + spacing.xxs} />
      <Skeleton width="55%" height={spacing.xxl - spacing.xs} />
      <Skeleton width="70%" height={spacing.md} />
      <Skeleton width="55%" height={spacing.md - spacing.xxs} style={styles.bestLabel} />
      <View style={styles.bestRow}>
        {[0, 1, 2].map(i => <Skeleton key={i} width={sizes.avatarMd} height={sizes.avatarMd} radius={radii.sm + spacing.xxs} />)}
      </View>
    </View>
  );
}

function LolBody() {
  return (
    <>
      <View style={styles.columns}>
        <QueueColumn />
        <QueueColumn right />
      </View>
      <Card style={styles.block}>
        <View style={styles.cardHead}>
          <Skeleton width="45%" height={spacing.md + spacing.xxs} />
          <Skeleton width="25%" height={spacing.md + spacing.xxs} />
        </View>
        <View style={styles.mastery}>
          {[0, 1, 2].map(i => <Skeleton key={i} width={sizes.iconHero - spacing.xxl} height={sizes.iconHero - spacing.xxl} radius={radii.md} />)}
        </View>
      </Card>
      <Skeleton width="50%" height={spacing.xl - spacing.xxs} style={styles.title} />
      {[0, 1, 2, 3].map(i => <RowSkeleton key={i} />)}
    </>
  );
}

function GenericBody() {
  return (
    <>
      <View style={styles.grid}>
        {[0, 1, 2].map(i => <Skeleton key={i} height={sizes.iconHero - spacing.lg} radius={radii.lg} style={styles.flex} />)}
      </View>
      <Skeleton width="50%" height={spacing.xl - spacing.xxs} style={styles.title} />
      {[0, 1, 2, 3].map(i => <RowSkeleton key={i} />)}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content:   { padding: spacing.lg },
  top:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  actions:   { flexDirection: "row", gap: spacing.lg, paddingRight: spacing.sm },
  bottom:    { flexDirection: "row", alignItems: "flex-end" },
  info:      { flex: 1, gap: spacing.sm },
  emblem:    { marginLeft: spacing.sm, marginRight: spacing.sm },
  updated:   { marginTop: spacing.lg, marginBottom: spacing.lg },
  columns:   { flexDirection: "row", marginBottom: spacing.xl, borderTopWidth: sizes.hairline, borderBottomWidth: sizes.hairline, borderColor: colors.border },
  col:       { flex: 1, paddingVertical: spacing.md, paddingRight: spacing.sm, gap: spacing.sm },
  colRight:  { borderLeftWidth: sizes.hairline, borderLeftColor: colors.border, paddingLeft: spacing.lg },
  bestLabel: { marginTop: spacing.xs },
  bestRow:   { flexDirection: "row", gap: spacing.md },
  block:     { marginBottom: spacing.xl },
  cardHead:  { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.lg },
  mastery:   { flexDirection: "row", justifyContent: "space-around" },
  title:     { marginBottom: spacing.md },
  grid:      { flexDirection: "row", gap: spacing.md, marginBottom: spacing.xl },
  flex:      { flex: 1 },
});
