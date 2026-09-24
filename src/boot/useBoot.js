import { useEffect, useState } from "react";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { BOOT_TASKS, TASK_TIMEOUT_MS } from "./tasks";

const TICK_MS = 60;
const SETTLE_MS = 450;   // pausa en 100 % antes de retirar la pantalla de carga

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("tiempo de espera agotado")), ms);
    promise.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

/**
 * Ejecuta las tareas de arranque y expone un progreso REAL:
 *  - progress: shared value 0..1 (tareas terminadas / total), suavizado y con duración mínima
 *  - fontsReady: las fuentes ya están cargadas (la pantalla de carga las necesita para el texto)
 *  - result: datos que dejaron las tareas (favoritos, juego guardado, estado del servidor)
 *  - finished: la barra llegó a 100 % y se puede retirar la pantalla de carga
 */
export function useBoot({ minDuration = 1800 } = {}) {
  const progress = useSharedValue(0);
  const [fontsReady, setFontsReady] = useState(false);
  const [result, setResult] = useState(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const start = Date.now();
    const values = {};
    let done = 0;
    let tick, settle;

    BOOT_TASKS.forEach(task => {
      withTimeout(Promise.resolve().then(task.run), TASK_TIMEOUT_MS)
        .then(v => { values[task.key] = v; })
        .catch(e => {
          console.warn(`Arranque: falló "${task.key}" -`, e.message);
          values[task.key] = task.fallback;
        })
        .finally(() => {
          done++;
          if (task.key === "fonts") setFontsReady(true);
        });
    });

    tick = setInterval(() => {
      const real    = done / BOOT_TASKS.length;
      const elapsed = (Date.now() - start) / minDuration;   // techo por tiempo mínimo
      const target  = Math.min(real, elapsed, 1);
      progress.value = withTiming(target, { duration: 300, easing: Easing.out(Easing.quad) });

      if (target >= 1) {
        clearInterval(tick);
        setResult({ ...values });
        settle = setTimeout(() => setFinished(true), 300 + SETTLE_MS);
      }
    }, TICK_MS);

    return () => { clearInterval(tick); clearTimeout(settle); };
  }, []);

  return { progress, fontsReady, result, finished };
}
