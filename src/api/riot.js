import axios from "axios";

// Cambia esto por la IP de tu PC cuando pruebes en celular
const BASE = "http://192.168.1.8:3000";  // ← reemplaza con tu IP

export const searchPlayer = async (gameName, tagLine) => {
  const account = await axios.get(`${BASE}/account/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);

  const summoner = await axios.get(`${BASE}/summoner/${account.data.puuid}`);
  const ranked = await axios.get(`${BASE}/ranked/${summoner.data.id}`);
  const matchIds = await axios.get(`${BASE}/matches/${account.data.puuid}`);
  const matches = await Promise.all(
    matchIds.data.map(id => axios.get(`${BASE}/match/${id}`).then(r => r.data))
  );
  return {
    account: account.data,
    summoner: summoner.data,
    ranked: ranked.data,
    matches,
  };
};