import React from "react";
import { View, Image } from "react-native";
import { medalOf } from "./utils";

const CDN = "https://www.opendota.com/assets/images/dota2/rank_icons";

// Medalla de rango de Dota 2 (imágenes de OpenDota, las mismas del juego) con sus estrellas
export default function DotaMedal({ rankTier, size }) {
  const m = medalOf(rankTier);
  if (!m || m.medal < 1 || m.medal > 8) return null;
  return (
    <View style={{ width: size, height: size }}>
      <Image source={{ uri: `${CDN}/rank_icon_${m.medal}.png` }} style={{ width: size, height: size }} resizeMode="contain" />
      {m.medal < 8 && m.stars > 0 ? (
        <Image source={{ uri: `${CDN}/rank_star_${m.stars}.png` }} style={{ position: "absolute", width: size, height: size }} resizeMode="contain" />
      ) : null}
    </View>
  );
}
