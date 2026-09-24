// Rutas de Riot por juego (plataforma = host regional tipo kr.api; routing = host de clúster tipo asia.api)
module.exports = {
  lol: {
    summoner: puuid => `/lol/summoner/v4/summoners/by-puuid/${puuid}`,
    ranked:   puuid => `/lol/league/v4/entries/by-puuid/${puuid}`,
    matchIds: (puuid, start, count) => `/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=${count}`,
    match:    id => `/lol/match/v5/matches/${id}`,
  },
  tft: {
    summoner: puuid => `/tft/summoner/v1/summoners/by-puuid/${puuid}`,
    ranked:   puuid => `/tft/league/v1/by-puuid/${puuid}`,
    matchIds: (puuid, start, count) => `/tft/match/v1/matches/by-puuid/${puuid}/ids?start=${start}&count=${count}`,
    match:    id => `/tft/match/v1/matches/${id}`,
  },
};
