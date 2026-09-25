import React from "react";
import meta from "./meta";
import { searchPlayer } from "./api";
import ProfileIcon from "./components/ProfileIcon";
import ProfileBody from "./ProfileBody";
import HomeExtras from "./HomeExtras";
import { getOverallStats } from "./utils";

// Módulo de League of Legends: lo que las pantallas genéricas necesitan saber del juego.
export default {
  ...meta,
  api: { search: searchPlayer },

  // Datos para la cabecera del perfil
  getProfile: data => ({
    avatar: <ProfileIcon iconId={data.summoner.profileIconId} level={data.summoner.summonerLevel} game={meta.id} />,
    name: data.account.gameName,
    tag: data.account.tagLine,
    subtitle: null,
    ranked: data.ranked?.find(r => r.queueType === "RANKED_SOLO_5x5") || null,
  }),

  // Lo que se guarda de un jugador al marcarlo favorito
  toFavorite: data => {
    const solo = data.ranked?.find(r => r.queueType === "RANKED_SOLO_5x5");
    return {
      puuid: data.account.puuid,
      gameName: data.account.gameName,
      tagLine: data.account.tagLine,
      iconId: data.summoner.profileIconId,
      tier: solo?.tier || null,
      rank: solo?.rank || null,
    };
  },

  // Estadísticas de la tarjeta de "compartir perfil": winrate y KDA de las últimas partidas, y los LP
  shareStats: (data, t) => {
    const overall = getOverallStats(data.matches || [], data.account.puuid);
    const solo = data.ranked?.find(r => r.queueType === "RANKED_SOLO_5x5");
    return [
      overall && { label: t("stats.winrate"), value: `${overall.wr}%` },
      overall && { label: t("stats.avgKda"), value: overall.kda },
      solo && { label: "LP", value: String(solo.leaguePoints) },
    ].filter(Boolean);
  },

  compare: true,   // el perfil muestra el botón "Comparar" (ver CompareScreen)

  ProfileBody,
  HomeExtras,   // opcional: extras en Inicio (estado del servidor, rotación gratuita)
};
