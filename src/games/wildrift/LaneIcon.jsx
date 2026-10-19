import React from "react";
import Svg, { Path } from "react-native-svg";

// Íconos de línea propios (trazos simples) para el selector de carril de Wild Rift
const PATHS = {
  baron:   ["M4 20V4h16", "M4 4l9 9"],
  jungle:  ["M12 3c3 4 5 7 5 10a5 5 0 0 1-10 0c0-3 2-6 5-10z"],
  mid:     ["M5 19L19 5", "M4 9V4h5", "M20 15v5h-5"],
  dragon:  ["M20 4v16H4", "M20 20l-9-9"],
  support: ["M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z"],
};

export default function LaneIcon({ lane, size, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {(PATHS[lane] || []).map((d, i) => <Path key={i} d={d} />)}
    </Svg>
  );
}
