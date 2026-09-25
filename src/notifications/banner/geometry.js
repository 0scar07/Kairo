// Medidas y curvas del banner fluido, compartidas por el fondo (Skia en móvil, vistas en web) y por el contenido.
// Todo se anima con valores compartidos de Reanimated (hilo de UI): pw/ph = ancho y alto de la cápsula, py = su borde
// superior, chip = progreso del chip "Ver partida" (0 = escondido dentro de la cápsula, 1 = separado debajo).

export const DROP = 26;          // diámetro de la gota inicial
export const COMPACT_W = 172;    // cápsula compacta (ícono con el texto todavía borroso)
export const COMPACT_H = 52;
export const FULL_H = 66;
export const CHIP_W = 128;
export const CHIP_H = 38;
export const CHIP_GAP = 10;      // separación final entre la cápsula y el chip

export const fullWidth = screenWidth => Math.min(screenWidth - 32, 440);

// Posición vertical del chip: nace pegado al borde inferior de la cápsula y se separa con el progreso
export const chipTop = (py, ph, chip) => {
  "worklet";
  return py + ph + (-CHIP_H * 0.85 + (CHIP_H * 0.85 + CHIP_GAP) * chip);
};

// Escala del chip: crece de una gota pequeña a su tamaño
export const chipScale = chip => {
  "worklet";
  return 0.45 + 0.55 * chip;
};

// Grosor del hilo líquido entre la cápsula y el chip: se estira y se afina hasta cortarse
export const neckWidth = chip => {
  "worklet";
  return Math.max(0, 1 - chip / 0.92) * 34;
};
