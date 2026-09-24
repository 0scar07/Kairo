import React, { useState } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { tftTrait } from "../assets";
import { traitColor } from "../utils";
import { colors, radii, sizes, spacing, fontSizes, type, withAlpha } from "../../../theme";

// Rasgo (trait) activo: ícono sobre el color de su nivel (bronce, plata, oro, cromático) y cantidad de unidades
export default function TraitBadge({ trait, size = sizes.avatarMd }) {
  const [failed, setFailed] = useState(false);
  const info  = tftTrait(trait.name);
  const color = traitColor(trait.style);

  return (
    <View style={styles.wrap}>
      <View style={[styles.hex, { width: size, height: size, borderColor: color, backgroundColor: withAlpha(color, 0.18) }]}>
        {info.icon && !failed ? (
          <Image source={{ uri: info.icon }} style={styles.img} resizeMode="contain" onError={() => setFailed(true)} />
        ) : (
          <Text style={[styles.initial, { color }]}>{info.name.slice(0, 2).toUpperCase()}</Text>
        )}
      </View>
      <Text style={[styles.count, { color }]}>{trait.num_units}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:    { alignItems: "center", marginRight: spacing.xs },
  hex:     {
    borderRadius: radii.md, borderWidth: sizes.borderThick,
    justifyContent: "center", alignItems: "center", padding: spacing.xs,
  },
  img:     { width: "100%", height: "100%", tintColor: colors.text },
  initial: { ...type.label },
  count:   { ...type.captionStrong, fontSize: fontSizes.xxs, marginTop: spacing.xxs },
});
