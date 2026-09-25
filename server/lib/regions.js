// Región (plataforma) -> clúster de enrutamiento regional de Riot
const REGIONS = {
  la1: "americas", la2: "americas", na1: "americas", br1: "americas",
  euw1: "europe", eun1: "europe", tr1: "europe", ru: "europe",
  kr: "asia", jp1: "asia",
  oc1: "sea", ph2: "sea", sg2: "sea", th2: "sea", tw2: "sea", vn2: "sea",
};

const DEFAULT_REGION = process.env.DEFAULT_REGION || "la1";

// PH2 y TH2 se fusionaron en SG2 (TFT y LoL): sus consultas de plataforma van al host de SG2
const PLATFORM_ALIASES = { ph2: "sg2", th2: "sg2" };

const platformHost = region => `https://${PLATFORM_ALIASES[region] || region}.api.riotgames.com`;
const routingHost  = region => `https://${REGIONS[region]}.api.riotgames.com`;
// account-v1 no existe en el clúster "sea": se consulta en "asia"
const accountHost  = region => `https://${REGIONS[region] === "sea" ? "asia" : REGIONS[region]}.api.riotgames.com`;

// Prefijo del matchId de match-v5 ("LA1_123"): la plataforma en mayúsculas, con PH2/TH2 fusionadas en SG2
const platformId = region => (PLATFORM_ALIASES[region] || region).toUpperCase();

const isRegion = value => Object.prototype.hasOwnProperty.call(REGIONS, value);

// El ID de partida empieza con la plataforma ("LA1_123", "KR_456"): sirve para elegir el clúster correcto
const regionFromMatchId = matchId => {
  const prefix = String(matchId).split("_")[0].toLowerCase();
  return isRegion(prefix) ? prefix : null;
};

module.exports = {
  REGIONS, DEFAULT_REGION, isRegion, platformHost, routingHost, accountHost, regionFromMatchId, platformId,
};
