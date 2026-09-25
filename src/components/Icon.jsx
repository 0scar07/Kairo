import React from "react";
import Svg, { Path, Circle, Polygon } from "react-native-svg";
import { colors, sizes } from "../theme";

// Íconos de trazo (estilo Feather/Lucide) dibujados con SVG para que se vean nítidos con cualquier color.
// paths: trazos; circles: [cx, cy, r]
const ICONS = {
  home:     { paths: ["M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M9 22V12h6v10"] },
  heart:    { paths: ["M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"] },
  settings: { paths: ["M4 21v-7", "M4 10V3", "M12 21v-9", "M12 8V3", "M20 21v-5", "M20 12V3", "M1 14h6", "M9 8h6", "M17 16h6"] },
  search:   { paths: ["M21 21l-4.35-4.35"], circles: [[11, 11, 8]] },
  close:    { paths: ["M18 6L6 18", "M6 6l12 12"] },
  check:    { paths: ["M20 6L9 17l-5-5"] },
  chevron:  { paths: ["M9 18l6-6-6-6"] },
  arrowDown:{ paths: ["M12 5v14", "M19 12l-7 7-7-7"] },
  edit:     { paths: ["M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"] },
  alert:    { paths: ["M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z", "M12 9v4", "M12 17h.01"] },
  tool:     { paths: ["M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"] },
  inbox:    { paths: ["M22 12h-6l-2 3h-4l-2-3H2", "M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"] },
  shield:   { paths: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"] },
  gamepad:  { paths: [
    "M6 12h4", "M8 10v4", "M15 13h.01", "M18 11h.01",
    "M17.32 5H6.68a4 4 0 0 0-3.98 3.59C2.6 9.42 2 14.46 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.41-1.41A2 2 0 0 1 9.83 16h4.34a2 2 0 0 1 1.42.59L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.55-.6-6.58-.68-7.26A4 4 0 0 0 17.32 5z",
  ] },
  trophy:   { paths: [
    "M6 9H4.5a2.5 2.5 0 0 1 0-5H6", "M18 9h1.5a2.5 2.5 0 0 0 0-5H18", "M4 22h16",
    "M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22", "M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22",
    "M18 2H6v7a6 6 0 0 0 12 0V2z",
  ] },
  flame:    { paths: ["M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"] },
  snowflake:{ paths: ["M2 12h20", "M12 2v20", "M20 16l-4-4 4-4", "M4 8l4 4-4 4", "M16 4l-4 4-4-4", "M8 20l4-4 4 4"] },
  zap:      { paths: ["M13 2L3 14h9l-1 8 10-12h-9l1-8z"] },
  target:   { paths: [], circles: [[12, 12, 10], [12, 12, 6], [12, 12, 2]] },
  crown:    { paths: ["M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z", "M3 20h18"] },
  award:    { paths: ["M8.21 13.89L7 23l5-3 5 3-1.21-9.12"], circles: [[12, 8, 7]] },
  barChart: { paths: ["M18 20V10", "M12 20V4", "M6 20v-6"] },
  trending: { paths: ["M23 6l-9.5 9.5-5-5L1 18", "M17 6h6v6"] },
  clock:    { paths: ["M12 6v6l4 2"], circles: [[12, 12, 10]] },
  bell:     { paths: ["M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9", "M13.73 21a2 2 0 0 1-3.46 0"] },
  bellOff:  { paths: ["M13.73 21a2 2 0 0 1-3.46 0", "M18.63 13A17.89 17.89 0 0 1 18 8", "M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14", "M18 8a6 6 0 0 0-9.33-5", "M1 1l22 22"] },
  eye:      { paths: ["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"], circles: [[12, 12, 3]] },
  moon:     { paths: ["M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"] },
  send:     { paths: ["M22 2L11 13", "M22 2l-7 20-4-9-9-4 20-7z"] },
  minus:    { paths: ["M5 12h14"] },
  plus:     { paths: ["M12 5v14", "M5 12h14"] },
  coins:    { paths: ["M12 7v10", "M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4"], circles: [[12, 12, 9]] },
};

const STAR = "12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26";

// filled: rellena la forma (solo estrella)
export default function Icon({ name, size = sizes.item, color = colors.text, strokeWidth = sizes.borderThick, filled, style }) {
  const icon = ICONS[name] || {};
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {name === "star" && <Polygon points={STAR} fill={filled ? color : "none"} />}
      {(icon.circles || []).map(([cx, cy, r]) => <Circle key={`${cx}-${cy}-${r}`} cx={cx} cy={cy} r={r} />)}
      {(icon.paths || []).map((d, i) => <Path key={i} d={d} />)}
    </Svg>
  );
}
