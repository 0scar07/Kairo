// Datos puros del juego (sin imports): los usa el tema para el color de acento
export default {
  id: "dota2",
  name: "Dota 2",
  short: "DOTA",
  accent: "#E4572E",
  available: true,
  search: "name",          // se busca por nombre (o ID de Steam), no por Nombre#TAG
  searchResults: true,     // el nombre se repite: primero una lista de resultados
  hasRegion: false,        // sin selector de región
};
