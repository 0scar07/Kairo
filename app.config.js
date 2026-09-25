// Configuración dinámica de Expo: parte de app.json y añade lo que depende del entorno.
//
// Android bloquea por defecto el tráfico HTTP sin cifrar en las apps instaladas. Solo se habilita
// cuando el backend configurado es http:// (pruebas locales). Con un backend https:// queda desactivado.
module.exports = ({ config }) => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || "";
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
