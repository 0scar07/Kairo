import React from "react";
import Svg, { Path, Circle } from "react-native-svg";
import { colors, sizes } from "../theme";

// Íconos de trazo (estilo Feather) dibujados con SVG para que se vean nítidos con cualquier color
const PATHS = {
  home:     ["M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M9 22V12h6v10"],
  heart:    ["M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"],
  settings: ["M4 21v-7", "M4 10V3", "M12 21v-9", "M12 8V3", "M20 21v-5", "M20 12V3", "M1 14h6", "M9 8h6", "M17 16h6"],
  search:   ["M21 21l-4.35-4.35"],
  close:    ["M18 6L6 18", "M6 6l12 12"],
  chevron:  ["M9 18l6-6-6-6"],
};

export default function Icon({ name, size = sizes.item, color = colors.text, strokeWidth = sizes.borderThick }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {name === "search" && <Circle cx="11" cy="11" r="8" />}
      {PATHS[name].map(d => <Path key={d} d={d} />)}
    </Svg>
  );
}
