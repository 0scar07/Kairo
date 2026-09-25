// Datos para abrir el perfil de algo guardado (favorito, reciente o "Mi perfil").
// Los juegos que buscan por nombre pueden guardar un `lookup` (el ID interno) porque el nombre visible se repite.
export const profileTarget = item => ({
  gameId: item.gameId,
  gameName: item.lookup ?? item.gameName,
  tagLine: item.tagLine ?? "",
  region: item.region,
});
