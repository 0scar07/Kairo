// Región (plataforma) -> clúster de enrutamiento regional de Riot
const REGIONS = {
  la1: "americas", la2: "americas", na1: "americas", br1: "americas",
  euw1: "europe", eun1: "europe", tr1: "europe", ru: "europe",
  kr: "asia", jp1: "asia",
  oc1: "sea", ph2: "sea", sg2: "sea", th2: "sea", tw2: "sea", vn2: "sea",
};

const DEFAULT_REGION = process.env.DEFAULT_REGION || "la1";

const platformHost = region => `https://${region}.api.riotgames.com`;
const routingHost  = region => `https://${REGIONS[region]}.api.riotgames.com`;
// account-v1 no existe en el clúster "sea": se consulta en "asia"
const accountHost  = region => `https://${REGIONS[region] === "sea" ? "asia" : REGIONS[region]}.api.riotgames.com`;

const isRegion = value => Object.prototype.hasOwnProperty.call(REGIONS, value);

// El ID de partida empieza con la plataforma ("LA1_123", "KR_456"): sirve para elegir el clúster correcto
const regionFromMatchId = matchId => {
  const prefix = String(matchId).split("_")[0].toLowerCase();
  return isRegion(prefix) ? prefix : null;
};

module.exports = {
  REGIONS, DEFAULT_REGION, isRegion, platformHost, routingHost, accountHost, regionFromMatchId,
};
