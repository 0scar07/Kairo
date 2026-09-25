// Configuración dinámica de Expo: parte de app.json y añade lo que depende del entorno.
//
// Android bloquea por defecto el tráfico HTTP sin cifrar en las apps instaladas. Solo se habilita
// cuando el backend configurado es http:// (pruebas locales). Con un backend https:// queda desactivado.
module.exports = ({ config }) => {
  // Subcarpeta donde se publica la versión web (GitHub Pages: /Kairo/app)
  if (process.env.EXPO_BASE_URL) config = { ...config, experiments: { ...config.experiments, baseUrl: process.env.EXPO_BASE_URL } };
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || "";
  // Firebase (notificaciones push en Android): en EAS el archivo llega como variable de archivo GOOGLE_SERVICES_JSON
  // (no está en git). Sin ella la app compila igual, solo que sin push.
  if (process.env.GOOGLE_SERVICES_JSON) config = { ...config, android: { ...config.android, googleServicesFile: process.env.GOOGLE_SERVICES_JSON } };
  const plugins = (config.plugins || []).filter(p => (Array.isArray(p) ? p[0] : p) !== "expo-build-properties");

  if (apiUrl.startsWith("http://")) {
    plugins.push(["expo-build-properties", { android: { usesCleartextTraffic: true } }]);
  }

  // Vista previa en Expo Go sin iniciar sesión: con `owner` y el projectId de EAS, Expo Go pide la cuenta dueña del proyecto.
  // Solo se quitan si se arranca con KAIRO_LOCAL_PREVIEW=1; los builds de EAS no lo usan.
  if (process.env.KAIRO_LOCAL_PREVIEW) {
    const { owner, extra, ...rest } = config;
    return { ...rest, plugins, extra: { ...extra, eas: undefined } };
  }

  return { ...config, plugins };
};
