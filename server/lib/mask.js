// Enmascara datos de jugadores en una ruta antes de escribirla en los logs:
// nombres de la ruta /account/:nombre/:tag e identificadores largos (PUUID).
const maskRoute = url =>
  String(url).split("?")[0]
    .replace(/\/account\/[^/]+\/[^/]+/, "/account/:name/:tag")
    .replace(/[\w-]{30,}/g, ":id");

module.exports = { maskRoute };
