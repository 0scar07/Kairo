import React from "react";
import { Image } from "react-native";

// Emblemas de rango oficiales (assets del cliente vía Community Dragon, ver scripts/generate-rank-emblems.py)
const EMBLEMS = {
  IRON:        require("../../assets/ranks/iron.png"),
  BRONZE:      require("../../assets/ranks/bronze.png"),
  SILVER:      require("../../assets/ranks/silver.png"),
  GOLD:        require("../../assets/ranks/gold.png"),
  PLATINUM:    require("../../assets/ranks/platinum.png"),
  EMERALD:     require("../../assets/ranks/emerald.png"),
  DIAMOND:     require("../../assets/ranks/diamond.png"),
  MASTER:      require("../../assets/ranks/master.png"),
  GRANDMASTER: require("../../assets/ranks/grandmaster.png"),
  CHALLENGER:  require("../../assets/ranks/challenger.png"),
};

const ASPECT = 256 / 224;   // proporción de los archivos generados

// `size` es el alto en px. Si el tier no existe no muestra nada.
export default function RankEmblem({ tier, size, style }) {
  const source = EMBLEMS[tier];
  if (!source) return null;
  return <Image source={source} resizeMode="contain" style={[{ width: size * ASPECT, height: size }, style]} />;
}
