const { createGameRouter } = require("./gameRouter");

// Teamfight Tactics: tft-summoner-v1, tft-league-v1, tft-match-v1
module.exports = createGameRouter({
  summoner: puuid => `/tft/summoner/v1/summoners/by-puuid/${puuid}`,
  ranked:   puuid => `/tft/league/v1/by-puuid/${puuid}`,
  matchIds: (puuid, start, count) => `/tft/match/v1/matches/by-puuid/${puuid}/ids?start=${start}&count=${count}`,
  match:    id => `/tft/match/v1/matches/${id}`,
});
