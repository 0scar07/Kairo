import React, { useState } from "react";
import { View, Image } from "react-native";
import { colors, radii } from "../../../theme";

// Ícono pequeño (hechizo, runa, campeón…) con placeholder si falta o falla la imagen
export default function Mini({ uri, size, round }) {
  const [failed, setFailed] = useState(false);
  const style = [{ width: size, height: size, borderRadius: round ? size / 2 : radii.xs, backgroundColor: colors.surfaceHigh }];
  if (!uri || failed) return <View style={style} />;
  return <Image source={{ uri }} style={style} onError={() => setFailed(true)} />;
}
