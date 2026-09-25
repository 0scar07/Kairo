import React from "react";
import meta from "./meta";
import { searchPlayer } from "./api";
import ProfileBody from "./ProfileBody";
import AvatarImage from "../../components/AvatarImage";
import { formatNumber } from "../../utils/format";
import { t } from "../../i18n";

const platformLabel = id => meta.platforms.find(p => p.id === id)?.label || id;
const wins = player => player.stats?.overall?.wins ?? 0;

// Módulo de Fortnite: lo que las pantallas genéricas necesitan saber del juego.
export default {
  ...meta,
  api: { search: searchPlayer },

  getProfile: data => ({
    avatar: <AvatarImage level={data.player.battlePass?.level} game={meta.id} />,
    name: data.account.gameName,
    tag: "",
    subtitle: platformLabel(data.platform),
    ranked: null,
    badge: t("fn.winsBadge", { n: formatNumber(wins(data.player)) }),
  }),

  toFavorite: data => ({
    puuid: data.account.puuid,
    gameName: data.account.gameName,
    tagLine: "",
    lookup: data.account.lookup,
    iconUrl: null,
    tier: null,
    rank: null,
    wins: wins(data.player),
  }),

  favoriteStat: fav => t("fn.winsBadge", { n: formatNumber(fav.wins ?? 0) }),

  ProfileBody,
};
