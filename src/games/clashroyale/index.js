import React from "react";
import meta from "./meta";
import { searchPlayer } from "./api";
import { cardIcon } from "./utils";
import ProfileBody from "./ProfileBody";
import AvatarImage from "../../components/AvatarImage";
import { formatNumber } from "../../utils/format";
import { clanRole, tagOf } from "../../utils/supercell";

// Clash Royale no tiene foto de perfil: se usa la carta favorita del jugador
const avatarUri = player => cardIcon(player.currentFavouriteCard);

// Módulo de Clash Royale: lo que las pantallas genéricas necesitan saber del juego.
export default {
  ...meta,
  api: { search: searchPlayer },

  getProfile: data => {
    const { player } = data;
    return {
      avatar: <AvatarImage uri={avatarUri(player)} level={player.expLevel} game={meta.id} />,
      name: data.account.gameName,
      tag: data.account.tagLine,
      subtitle: player.clan ? [player.clan.name, clanRole(player.role)].filter(Boolean).join(" · ") : "Sin clan",
      ranked: null,
      badge: `${formatNumber(player.trophies)} trofeos`,
    };
  },

  toFavorite: data => ({
    puuid: tagOf(data.player.tag),
    gameName: data.account.gameName,
    tagLine: data.account.tagLine,
    iconUrl: avatarUri(data.player),
    tier: null,
    rank: null,
    label: `${formatNumber(data.player.trophies)} trofeos`,
  }),

  ProfileBody,
};
