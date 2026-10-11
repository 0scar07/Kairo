import React, { useEffect, useState } from "react";
import { Text } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

/**
 * Número que cuenta desde 0 hasta `value` al aparecer (o desde el valor anterior si cambia).
 * El lector de pantalla siempre lee el valor final; con "Reducir movimiento" se muestra directamente.
 *  - format: v => texto (ej. v => `${v}%`)
 */
export default function CountUp({ value, duration = 900, delay = 150, format = String, style, ...rest }) {
  const reduce = useReducedMotion();
  const target = Number(value) || 0;
  const [shown, setShown] = useState(reduce ? target : 0);

  useEffect(() => {
    if (reduce) { setShown(target); return undefined; }
    let raf, t0 = null;
    const from = shown;
    const tick = t => {
      if (t0 === null) t0 = t;
      const p = Math.min(Math.max((t - t0 - delay) / duration, 0), 1);
      const e = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(from + (target - from) * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduce]);

  return <Text style={style} accessibilityLabel={format(target)} {...rest}>{format(shown)}</Text>;
}
