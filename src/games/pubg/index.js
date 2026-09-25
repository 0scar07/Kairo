import React from "react";
import meta from "./meta";
import { searchPlayer } from "./api";
import { totalWins } from "./utils";
import ProfileBody from "./ProfileBody";
import AvatarImage from "../../components/AvatarImage";
import { formatNumber } from "../../utils/format";
import { t } from "../../i18n";

const platformLabel = id => meta.platforms.find(p => p.id === id)?.label || id;

// Módulo de PUBG: lo que las pantallas genéricas necesitan saber del juego.
export default {
  ...meta,
  api: { search: searchPlayer },

  getProfile: data => ({
    avatar: <AvatarImage game={meta.id} />,
    name: data.account.gameName,
    tag: "",
    subtitle: platformLabel(data.platform),
    ranked: null,
    badge: t("pubg.winsBadge", { n: formatNumber(totalWins(data.player.modes)) }),
  }),

  toFavorite: data => ({
    puuid: data.account.puuid,
    gameName: data.account.gameName,
    tagLine: "",
    lookup: data.account.lookup,
    iconUrl: null,
    tier: null,
    rank: null,
    wins: totalWins(data.player.modes),
  }),

  favoriteStat: fav => t("pubg.winsBadge", { n: formatNumber(fav.wins ?? 0) }),

  ProfileBody,
};
