import axios from "axios";

import { API_BASE as BASE } from "../constants/config";

export const searchTFTPlayer = async (gameName, tagLine) => {
  const account  = await axios.get(`${BASE}/account/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
  const summoner = await axios.get(`${BASE}/tft/summoner/${account.data.puuid}`);
  const ranked   = await axios.get(`${BASE}/tft/ranked/${account.data.puuid}`);
  const matchIds = await axios.get(`${BASE}/tft/matches/${account.data.puuid}`);
  const matches  = await Promise.all(
    matchIds.data.map(id => axios.get(`${BASE}/tft/match/${id}`).then(r => r.data))
  );
  return {
    account:  account.data,
    summoner: summoner.data,
    ranked:   ranked.data,
    matches:  matches.filter(Boolean),
  };
};

export const getAccountByRiotId = async (gameName, tagLine) => {
  const res = await axios.get(`${BASE}/account/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
  return res.data;
};