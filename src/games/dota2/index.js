import React from "react";
import meta from "./meta";
import { searchPlayer, findPlayers } from "./api";
import ProfileBody from "./ProfileBody";
import DotaMedal from "./DotaMedal";
import { rankLabel } from "./utils";
import AvatarImage from "../../components/AvatarImage";
import { sizes } from "../../theme";

// Módulo de Dota 2: lo que las pantallas genéricas necesitan saber del juego.
export default {
  ...meta,
  api: { search: searchPlayer, find: findPlayers },

  getProfile: data => {
    const { player } = data;
    return {
      avatar: <AvatarImage uri={player.profile.avatar} game={meta.id} />,
      name: data.account.gameName,
      tag: "",
      subtitle: `ID ${player.id}`,
      ranked: null,
      badge: rankLabel(player.rankTier, player.leaderboardRank),
      badgeIcon: <DotaMedal rankTier={player.rankTier} size={sizes.item} />,
    };
  },

  toFavorite: data => ({
    puuid: data.player.id,
    gameName: data.account.gameName,
    tagLine: "",
    lookup: data.player.id,
    iconUrl: data.player.profile.avatar,
    tier: null,
    rank: null,
    rankTier: data.player.rankTier,
    leaderboardRank: data.player.leaderboardRank,
  }),

  // Texto que muestra la tarjeta de favorito (se calcula al pintar, en el idioma activo)
  favoriteStat: fav => rankLabel(fav.rankTier, fav.leaderboardRank),

  ProfileBody,
};
