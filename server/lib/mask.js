// Enmascara datos de jugadores en una ruta antes de escribirla en los logs:
// nombres de la ruta /account/:nombre/:tag, tags de Supercell (/player/:tag) e identificadores largos (PUUID).
const maskRoute = url =>
  String(url).split("?")[0]
    .replace(/\/account\/[^/]+\/[^/]+/, "/account/:name/:tag")
    .replace(/\/(player|battles)\/[^/]+/, "/$1/:tag")
    .replace(/\/players\/(%23|#)[^/]+/, "/players/:tag")
    .replace(/[\w-]{30,}/g, ":id");

module.exports = { maskRoute };
