// APIs de terceros de los demás juegos (Dota 2, Fortnite, Apex Legends y PUBG): su estado alimenta /health.games
const dota2 = require("../routes/dota2");
const fortnite = require("../routes/fortnite");
const apex = require("../routes/apex");
const pubg = require("../routes/pubg");

const ROUTES = { dota2, fortnite, apex, pubg };
const UPSTREAMS = Object.fromEntries(Object.entries(ROUTES).map(([id, m]) => [id, m.upstream]));

module.exports = { ROUTES, UPSTREAMS };
