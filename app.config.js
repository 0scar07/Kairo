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

  return { ...config, plugins };
};
