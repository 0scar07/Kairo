const { Router } = require("express");
const { HttpError, TTL, riotGet, handle } = require("../lib/riot");
const {
  DEFAULT_REGION, isRegion, platformHost, routingHost, accountHost, regionFromMatchId,
} = require("../lib/regions");

const PUUID_RE    = /^[\w-]{20,100}$/;
const MATCH_ID_RE = /^[A-Za-z0-9]+_\d+$/;

function regionOf(req) {
  const region = String(req.query.region || DEFAULT_REGION).toLowerCase();
  if (!isRegion(region)) throw new HttpError(400, `Región no válida: ${region}`);
  return region;
}

function puuidOf(req) {
  if (!PUUID_RE.test(req.params.puuid)) throw new HttpError(400, "PUUID no válido");
  return req.params.puuid;
}

function pageOf(req) {
  const count = Math.min(Math.max(parseInt(req.query.count, 10) || 10, 1), 20);
  const start = Math.max(parseInt(req.query.start, 10) || 0, 0);
  return { start, count };
}

/**
 * Crea el router de un juego. LoL y TFT tienen la misma forma y solo cambian las rutas de Riot:
 *   paths.summoner(puuid), paths.ranked(puuid), paths.matchIds(puuid, start, count), paths.match(id)
 */
function createGameRouter(paths) {
  const router = Router();

  // La cuenta Riot es común a todos los juegos
  router.get("/account/:gameName/:tagLine", handle(async (req, res) => {
    const { gameName, tagLine } = req.params;
    const url = `${accountHost(regionOf(req))}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    res.json(await riotGet(url, { ttl: TTL.account, notFound: "Jugador no encontrado" }));
  }));

  router.get("/summoner/:puuid", handle(async (req, res) => {
    const url = `${platformHost(regionOf(req))}${paths.summoner(puuidOf(req))}`;
    res.json(await riotGet(url, { ttl: TTL.summoner, notFound: "Este jugador no tiene perfil en este juego" }));
  }));

  router.get("/ranked/:puuid", handle(async (req, res) => {
    const url = `${platformHost(regionOf(req))}${paths.ranked(puuidOf(req))}`;
    res.json(await riotGet(url, { ttl: TTL.ranked }));
  }));

  router.get("/matches/:puuid", handle(async (req, res) => {
    const { start, count } = pageOf(req);
    const url = `${routingHost(regionOf(req))}${paths.matchIds(puuidOf(req), start, count)}`;
    res.json(await riotGet(url, { ttl: TTL.matchIds }));
  }));

  router.get("/match/:matchId", handle(async (req, res) => {
    const { matchId } = req.params;
    if (!MATCH_ID_RE.test(matchId)) throw new HttpError(400, "ID de partida no válido");
    // El prefijo del ID indica el clúster correcto aunque la región del cliente sea otra
    const region = regionFromMatchId(matchId) || regionOf(req);
    const url = `${routingHost(region)}${paths.match(matchId)}`;
    res.json(await riotGet(url, { ttl: TTL.match, notFound: "Partida no encontrada" }));
  }));

  return router;
}

module.exports = { createGameRouter };
