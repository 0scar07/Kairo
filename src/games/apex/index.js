import React from "react";
import { Image } from "react-native";
import meta from "./meta";
import { searchPlayer } from "./api";
import { rankLabel } from "./utils";
import ProfileBody from "./ProfileBody";
import AvatarImage from "../../components/AvatarImage";
import { sizes } from "../../theme";
import { t } from "../../i18n";

const platformLabel = id => meta.platforms.find(p => p.id === id)?.label || id;

// Módulo de Apex Legends: lo que las pantallas genéricas necesitan saber del juego.
export default {
  ...meta,
  api: { search: searchPlayer },

  getProfile: data => {
    const { global: g, realtime } = data.player;
    const status = realtime ? (realtime.inGame ? t("apex.inGame") : realtime.online ? t("apex.online") : t("apex.offline")) : null;
    return {
      avatar: <AvatarImage uri={g.avatar || null} level={g.level} game={meta.id} />,
      name: data.account.gameName,
      tag: "",
      subtitle: [platformLabel(data.platform), status].filter(Boolean).join(" · "),
      ranked: null,
      badge: rankLabel(g.rank),
      badgeIcon: g.rank?.image ? <Image source={{ uri: g.rank.image }} style={{ width: sizes.item, height: sizes.item }} resizeMode="contain" /> : null,
    };
  },

  toFavorite: data => ({
    puuid: data.account.puuid,
    gameName: data.account.gameName,
    tagLine: "",
    lookup: data.account.lookup,
    iconUrl: data.player.global.avatar || null,
    tier: null,
    rank: null,
    apexRank: data.player.global.rank,
  }),

  favoriteStat: fav => rankLabel(fav.apexRank),

  ProfileBody,
};
