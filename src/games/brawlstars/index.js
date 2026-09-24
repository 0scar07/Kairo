import React from "react";
import meta from "./meta";
import { searchPlayer } from "./api";
import { profileIcon } from "./assets";
import ProfileBody from "./ProfileBody";
import AvatarImage from "../../components/AvatarImage";
import { formatNumber } from "../../utils/format";
import { tagOf } from "../../utils/supercell";

// Módulo de Brawl Stars: lo que las pantallas genéricas necesitan saber del juego.
export default {
  ...meta,
  api: { search: searchPlayer },

  getProfile: data => ({
    avatar: <AvatarImage uri={data.player.icon?.id != null ? profileIcon(data.player.icon.id) : null} level={data.player.expLevel} game={meta.id} />,
    name: data.account.gameName,
    tag: data.account.tagLine,
    subtitle: data.player.club?.name || "Sin club",
    ranked: null,
    badge: `${formatNumber(data.player.trophies)} trofeos`,
  }),

  toFavorite: data => ({
    puuid: tagOf(data.player.tag),
    gameName: data.account.gameName,
    tagLine: data.account.tagLine,
    iconUrl: data.player.icon?.id != null ? profileIcon(data.player.icon.id) : null,
    tier: null,
    rank: null,
    label: `${formatNumber(data.player.trophies)} trofeos`,
  }),

  ProfileBody,
};
