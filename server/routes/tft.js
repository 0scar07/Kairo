const { createGameRouter } = require("./gameRouter");
const PATHS = require("../lib/paths");

// Teamfight Tactics: tft-summoner-v1, tft-league-v1, tft-match-v1
module.exports = createGameRouter("tft", PATHS.tft);
