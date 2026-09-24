const { createGameRouter } = require("./gameRouter");

// League of Legends: summoner-v4, league-v4, match-v5
module.exports = createGameRouter({
  summoner: puuid => `/lol/summoner/v4/summoners/by-puuid/${puuid}`,
  ranked:   puuid => `/lol/league/v4/entries/by-puuid/${puuid}`,
  matchIds: (puuid, start, count) => `/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=${count}`,
  match:    id => `/lol/match/v5/matches/${id}`,
});
