import React from "react";
import meta from "./meta";
import { searchPlayer } from "./api";
import ProfileBody from "./ProfileBody";
import AvatarImage from "../../components/AvatarImage";
import { clanRole, tagOf } from "../../utils/supercell";

// Clash of Clans no tiene foto de perfil: se usa el ícono de su liga
const leagueIcon = player => player.league?.iconUrls?.medium || player.league?.iconUrls?.small || null;

// Módulo de Clash of Clans: lo que las pantallas genéricas necesitan saber del juego.
export default {
  ...meta,
  api: { search: searchPlayer },

  getProfile: data => {
    const { player } = data;
    return {
      avatar: <AvatarImage uri={leagueIcon(player)} level={player.expLevel} game={meta.id} />,
      name: data.account.gameName,
      tag: data.account.tagLine,
      subtitle: player.clan ? [player.clan.name, clanRole(player.role)].filter(Boolean).join(" · ") : "Sin clan",
      ranked: null,
      badge: `Ayuntamiento ${player.townHallLevel}`,
    };
  },

  toFavorite: data => ({
    puuid: tagOf(data.player.tag),
    gameName: data.account.gameName,
    tagLine: data.account.tagLine,
    iconUrl: leagueIcon(data.player),
    tier: null,
    rank: null,
    label: `Ayuntamiento ${data.player.townHallLevel}`,
  }),

  ProfileBody,
};
