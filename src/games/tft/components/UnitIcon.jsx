import React, { useState } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { tftChampion } from "../assets";
import { unitCost } from "../utils";
import { colors, radii, sizes, spacing, fontSizes, type } from "../../../theme";

// Unidad de TFT: borde del color de su costo, estrellas de nivel y placeholder si no hay imagen
export default function UnitIcon({ unit, size = sizes.avatarMd }) {
  const [failed, setFailed] = useState(false);
  const info  = tftChampion(unit.character_id);
  const cost  = unitCost(unit, info.cost);
  const color = colors.cost[cost] || colors.textFaint;
  const stars = unit.tier > 1 ? unit.tier : 0;

  return (
    <View style={styles.wrap}>
      {stars > 0 && (
        <Text style={[styles.stars, { color: stars >= 3 ? colors.placement.first : colors.placement.second }]}>
          {"★".repeat(stars)}
        </Text>
      )}
      <View style={[styles.box, { width: size, height: size, borderColor: color }]}>
        {info.icon && !failed ? (
          <Image source={{ uri: info.icon }} style={styles.img} resizeMode="cover" onError={() => setFailed(true)} />
        ) : (
          <Text style={[styles.initial, { color }]}>{info.name.slice(0, 2).toUpperCase()}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:    { alignItems: "center", marginRight: spacing.xs },
  stars:   { fontSize: fontSizes.xxs, lineHeight: fontSizes.xxs },
  box:     {
    borderRadius: radii.sm, borderWidth: sizes.borderThick, overflow: "hidden",
    backgroundColor: colors.surfaceHigh, justifyContent: "center", alignItems: "center",
  },
  img:     { width: "100%", height: "100%" },
  initial: { ...type.label },
});
