// APIs de terceros de los demás juegos (Dota 2, Fortnite, Apex Legends, PUBG, Wild Rift y Valorant): su estado alimenta /health.games
const dota2 = require("../routes/dota2");
const fortnite = require("../routes/fortnite");
const apex = require("../routes/apex");
const pubg = require("../routes/pubg");
const wildrift = require("../routes/wildrift");
const valorant = require("../routes/valorant");

const ROUTES = { dota2, fortnite, apex, pubg, wildrift, valorant };
const UPSTREAMS = Object.fromEntries(Object.entries(ROUTES).map(([id, m]) => [id, m.upstream]));

module.exports = { ROUTES, UPSTREAMS };
