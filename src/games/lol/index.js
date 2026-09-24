import React from "react";
import meta from "./meta";
import { searchPlayer } from "./api";
import ProfileIcon from "./components/ProfileIcon";
import ProfileBody from "./ProfileBody";
import HomeExtras from "./HomeExtras";

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

  ProfileBody,
  HomeExtras,   // opcional: extras en Inicio (estado del servidor, rotación gratuita)
};
