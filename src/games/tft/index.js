import React from "react";
import { View, Image, StyleSheet } from "react-native";
import meta from "./meta";
import { searchPlayer } from "./api";
import ProfileBody from "./ProfileBody";
import { t } from "../../i18n";
import GameLogo from "../../components/GameLogo";
import { profileIconUrl } from "../../api/ddragon";
import { colors, sizes, accents } from "../../theme";

// Ícono de perfil (es de la cuenta Riot: el mismo que en LoL); si falta, el logo del juego
function TftAvatar({ iconId }) {
  const accent = accents[meta.id];
  return (
    <View style={[styles.avatar, { borderColor: accent }]}>
      {iconId != null
        ? <Image source={{ uri: profileIconUrl(iconId) }} style={styles.img} />
        : <GameLogo game="tft" size={sizes.avatarSm} color={accent} />}
    </View>
  );
}

// Módulo de Teamfight Tactics: lo que las pantallas genéricas necesitan saber del juego.
export default {
  ...meta,
  api: { search: searchPlayer },

  getProfile: data => ({
    avatar: <TftAvatar iconId={data.summoner?.profileIconId} />,
    name: data.account.gameName,
    tag: data.account.tagLine,
    subtitle: data.summoner?.summonerLevel ? t("tft.level", { level: data.summoner.summonerLevel }) : null,
    ranked: data.ranked?.find(r => r.queueType === "RANKED_TFT") || null,
  }),

  toFavorite: data => {
    const r = data.ranked?.find(x => x.queueType === "RANKED_TFT");
    return {
      puuid: data.account.puuid,
      gameName: data.account.gameName,
      tagLine: data.account.tagLine,
      iconId: data.summoner?.profileIconId ?? null,
      tier: r?.tier || null,
      rank: r?.rank || null,
    };
  },

  ProfileBody,
};

const styles = StyleSheet.create({
  avatar: {
    width: sizes.iconHero, height: sizes.iconHero, borderRadius: sizes.iconHero / 2,
    borderWidth: sizes.borderAccent, backgroundColor: colors.surfaceHigh,
    justifyContent: "center", alignItems: "center", overflow: "hidden",
  },
  img:   { width: "100%", height: "100%" },
});
