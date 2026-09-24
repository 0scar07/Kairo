export const spacing = {
  xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48, hero: 60,
};

export const radii = {
  xs: 4, sm: 6, md: 10, lg: 14, xl: 20, pill: 999,
};

// Tamaños fijos de componentes
export const sizes = {
  hairline:  1,
  borderThick: 2,
  borderAccent: 3,
  barThin:   3,
  bar:       4,
  barSplash: 3,
  avatarXs:  20,
  item:      24,
  avatarSm:  32,
  avatarMd:  36,
  avatarLg:  40,
  placement: 44,
  button:    50,
  avatarXl:  72,
  avatarHero: 80,
  iconHero:  96,
  dot:       6,
  chart:     120,
  tabBarSpace: 120,   // espacio inferior para que la barra flotante no tape el contenido
  splashLogo: 260,   // debe coincidir con imageWidth del plugin expo-splash-screen en app.json
  splashBar:  160,
  splashGlow: 560,
};

// Resplandor de color (sombra sin desplazamiento)
export const glow = (color, radius = 14, opacity = 0.55) => ({
  shadowColor: color,
  shadowOpacity: opacity,
  shadowRadius: radius,
  shadowOffset: { width: 0, height: 0 },
  elevation: 8,
});
