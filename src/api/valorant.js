import axios from "axios";

import { API_BASE as BASE } from "../constants/config";

export const searchValorantPlayer = async (gameName, tagLine) => {
  const account   = await axios.get(`${BASE}/account/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
  const summoner  = await axios.get(`${BASE}/summoner/${account.data.puuid}`);
  const matchList = await axios.get(`${BASE}/val/matches/${account.data.puuid}`);
  const matchIds  = matchList.data.history?.slice(0, 10).map(m => m.matchId) || [];
  const matches   = await Promise.all(
    matchIds.map(id => axios.get(`${BASE}/val/match/${id}`).then(r => r.data))
  );
  return {
    account:  account.data,
    summoner: summoner.data,
    matches:  matches.filter(Boolean),
  };
};