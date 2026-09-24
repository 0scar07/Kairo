require("dotenv").config();
const express = require("express");
const axios   = require("axios");
const cors    = require("cors");

const app      = express();
const API_KEY  = process.env.RIOT_API_KEY;
if (!API_KEY) {
  console.error("Falta RIOT_API_KEY en server/.env (ver .env.example)");
  process.exit(1);
}
const ROUTING  = "https://americas.api.riotgames.com";
const PLATFORM = "https://la1.api.riotgames.com";

app.use(cors());
app.use(express.json());

const headers = { "X-Riot-Token": API_KEY };

// ─── CUENTA ───────────────────────────────────────────────────────────────────
app.get("/account/:gameName/:tagLine", async (req, res) => {
  try {
    const { gameName, tagLine } = req.params;
    console.log("Buscando:", gameName, tagLine);
    const r = await axios.get(
      `${ROUTING}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
      { headers }
    );
    res.json(r.data);
  } catch (e) {
    console.log("Error:", e.response?.status, e.message);
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

// ─── LOL ──────────────────────────────────────────────────────────────────────
app.get("/summoner/:puuid", async (req, res) => {
  try {
    const r = await axios.get(
      `${PLATFORM}/lol/summoner/v4/summoners/by-puuid/${req.params.puuid}`,
      { headers }
    );
    res.json(r.data);
  } catch (e) {
    console.log("Error summoner:", e.response?.status, e.message);
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

app.get("/ranked/:summonerId", async (req, res) => {
  try {
    const r = await axios.get(
      `${PLATFORM}/lol/league/v4/entries/by-summoner/${req.params.summonerId}`,
      { headers }
    );
    res.json(r.data);
  } catch (e) {
    console.log("Error ranked:", e.response?.status, e.message);
    res.json([]);
  }
});

app.get("/matches/:puuid", async (req, res) => {
  try {
    const count = req.query.count || 10;
    const r = await axios.get(
      `${ROUTING}/lol/match/v5/matches/by-puuid/${req.params.puuid}/ids?count=${count}`,
      { headers }
    );
    res.json(r.data);
  } catch (e) {
    console.log("Error matches:", e.response?.status, e.message);
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

app.get("/match/:matchId", async (req, res) => {
  try {
    const r = await axios.get(
      `${ROUTING}/lol/match/v5/matches/${req.params.matchId}`,
      { headers }
    );
    res.json(r.data);
  } catch (e) {
    console.log("Error match:", e.response?.status, e.message);
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

// ─── VALORANT ─────────────────────────────────────────────────────────────────
app.get("/val/matches/:puuid", async (req, res) => {
  try {
    const r = await axios.get(
      `${ROUTING}/val/match/v1/matchlists/by-puuid/${req.params.puuid}`,
      { headers }
    );
    res.json(r.data);
  } catch (e) {
    console.log("Error val matches:", e.response?.status, e.message);
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

app.get("/val/match/:matchId", async (req, res) => {
  try {
    const r = await axios.get(
      `${ROUTING}/val/match/v1/matches/${req.params.matchId}`,
      { headers }
    );
    res.json(r.data);
  } catch (e) {
    console.log("Error val match:", e.response?.status, e.message);
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

// ─── TFT ──────────────────────────────────────────────────────────────────────
app.get("/tft/summoner/:puuid", async (req, res) => {
  try {
    const r = await axios.get(
      `${PLATFORM}/tft/summoner/v1/summoners/by-puuid/${req.params.puuid}`,
      { headers }
    );
    res.json(r.data);
  } catch (e) {
    console.log("Error tft summoner:", e.response?.status, e.message);
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

app.get("/tft/ranked/:summonerId", async (req, res) => {
  try {
    const r = await axios.get(
      `${PLATFORM}/tft/league/v1/entries/by-summoner/${req.params.summonerId}`,
      { headers }
    );
    res.json(r.data);
  } catch (e) {
    console.log("Error tft ranked:", e.response?.status, e.message);
    res.json([]);
  }
});

app.get("/tft/matches/:puuid", async (req, res) => {
  try {
    const r = await axios.get(
      `${ROUTING}/tft/match/v1/matches/by-puuid/${req.params.puuid}/ids?count=10`,
      { headers }
    );
    res.json(r.data);
  } catch (e) {
    console.log("Error tft matches:", e.response?.status, e.message);
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

app.get("/tft/match/:matchId", async (req, res) => {
  try {
    const r = await axios.get(
      `${ROUTING}/tft/match/v1/matches/${req.params.matchId}`,
      { headers }
    );
    res.json(r.data);
  } catch (e) {
    console.log("Error tft match:", e.response?.status, e.message);
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

const PORT_NUM = process.env.PORT || 3000;
app.listen(PORT_NUM, () => console.log(`✅ Backend corriendo en http://localhost:${PORT_NUM}`));
