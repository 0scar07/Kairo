import React from "react";
import { StyleSheet } from "react-native";
import { Canvas, Group, Paint, Blur, BlurMask, ColorMatrix, RoundedRect, LinearGradient, vec } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";
import { CHIP_H, CHIP_W, chipScale, chipTop, neckWidth } from "./geometry";

// Convierte el alfa suavizado por el desenfoque en un borde nítido: donde dos formas se acercan se funden como líquido
// (metaballs). Es el truco clásico "gooey": Blur + ColorMatrix con la fila de alfa multiplicada y desplazada.
const GOO = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 22, -9];

/**
 * Fondo del banner en móvil, dibujado con Skia: la cápsula, el chip y el hilo entre ambos son formas que se funden.
 * `geo` trae los valores compartidos de la animación (ver geometry.js); Skia los lee directamente en el hilo de UI.
 */
export default function GlassBackdrop({ geo, width, height }) {
  const { pw, ph, py, chip, alpha } = geo;

  const capX = useDerivedValue(() => (width - pw.value) / 2);
  const capR = useDerivedValue(() => ph.value / 2);
  const shadowY = useDerivedValue(() => py.value + 10);
  const shadowOpacity = useDerivedValue(() => alpha.value * 0.7);

  const chipW = useDerivedValue(() => CHIP_W * chipScale(chip.value));
  const chipH = useDerivedValue(() => CHIP_H * chipScale(chip.value));
  const chipX = useDerivedValue(() => (width - CHIP_W * chipScale(chip.value)) / 2);
  const chipY = useDerivedValue(() => chipTop(py.value, ph.value, chip.value));
  const chipR = useDerivedValue(() => (CHIP_H * chipScale(chip.value)) / 2);

  // Hilo entre la cápsula y el chip: desde dentro de la cápsula hasta la mitad del chip
  const neckW = useDerivedValue(() => neckWidth(chip.value));
  const neckX = useDerivedValue(() => (width - neckWidth(chip.value)) / 2);
  const neckY = useDerivedValue(() => py.value + ph.value - 8);
  const neckH = useDerivedValue(() => Math.max(0, chipTop(py.value, ph.value, chip.value) + CHIP_H * chipScale(chip.value) / 2 - (py.value + ph.value - 8)));
  const neckR = useDerivedValue(() => neckWidth(chip.value) / 2);
  const chipVisible = useDerivedValue(() => (chip.value > 0.01 ? 1 : 0));

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Sombra suave bajo la cápsula (aparte del efecto líquido, para no mezclar filtros de imagen) */}
      <Group opacity={shadowOpacity}>
        <RoundedRect x={capX} y={shadowY} width={pw} height={ph} r={capR} color="#000000">
          <BlurMask blur={14} style="normal" />
        </RoundedRect>
      </Group>
      <Group
        opacity={alpha}
        layer={(
          <Paint>
            <Blur blur={7} />
            <ColorMatrix matrix={GOO} />
          </Paint>
        )}
      >
        <RoundedRect x={capX} y={py} width={pw} height={ph} r={capR}>
          <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={["#26343F", "#0E171E"]} />
        </RoundedRect>
        <Group opacity={chipVisible}>
          <RoundedRect x={neckX} y={neckY} width={neckW} height={neckH} r={neckR} color="#1B2732" />
          <RoundedRect x={chipX} y={chipY} width={chipW} height={chipH} r={chipR}>
            <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={["#26343F", "#0E171E"]} />
          </RoundedRect>
        </Group>
      </Group>
    </Canvas>
  );
}
