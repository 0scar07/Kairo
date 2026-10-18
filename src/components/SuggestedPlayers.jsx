import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Card, SectionLabel, PressableScale, RowSkeleton } from "./ui";
import FavoriteStar from "./FavoriteStar";
import GameLogo from "./GameLogo";
import { getLeaderboard } from "../games/lol/api";
import { getRegion } from "../constants/regions";
import { isFavoriteIn, toggleFavorite } from "../utils/favorites";
import { formatNumber } from "../utils/format";
import { select } from "../utils/haptics";
import { useT } from "../i18n/I18nProvider";
import { accents, colors, radii, sizes, spacing, type, withAlpha } from "../theme";

const COUNT = 3;
const cache = new Map();   // región -> promesa con los primeros del ranking (se piden una vez por sesión)

const topOf = region => {
  if (!cache.has(region)) {
    cache.set(region, getLeaderboard(region, { limit: COUNT + 2 })
      .then(r => r.players.filter(p => p.gameName).slice(0, COUNT))
      .catch(e => { cache.delete(region); throw e; }));
  }
  return cache.get(region);
};

/**
 * Sugerencias para un estado vacío de favoritos (solo LoL): los primeros del ranking Challenger de la región, para
 * abrir su perfil o seguirlos con la estrella sin tener que buscarlos. Si el ranking no carga, no se muestra nada.
 *  - favorites / onChanged: la lista actual y quién la recibe al marcar o desmarcar a alguien
 */
export default function SuggestedPlayers({ region, favorites, onChanged, onOpen }) {
  const t = useT();
  const [players, setPlayers] = useState(null);   // null = cargando, [] = sin datos

  useEffect(() => {
    let alive = true;
    setPlayers(null);
    topOf(region).then(list => { if (alive) setPlayers(list); }).catch(() => { if (alive) setPlayers([]); });
    return () => { alive = false; };
  }, [region]);

  if (players && players.length === 0) return null;

  const favOf = p => ({ gameId: "lol", region, puuid: p.puuid, gameName: p.gameName, tagLine: p.tagLine, tier: "CHALLENGER", rank: "I" });

  async function toggle(p) {
    select();
    const { favorites: next } = await toggleFavorite(favOf(p));
    onChanged?.(next);
  }

  return (
    <View style={styles.wrap}>
      <SectionLabel style={styles.label}>{t("suggested.title", { region: getRegion(region).label })}</SectionLabel>
      <Card style={styles.card}>
        {players === null
          ? Array.from({ length: COUNT }, (_, i) => <RowSkeleton key={i} />)
          : players.map((p, i) => {
            const fav = isFavoriteIn(favorites || [], favOf(p));
            return (
              <View key={p.puuid} style={[styles.row, i > 0 && styles.divider]}>
                <Pressable
                  style={styles.main}
                  onPress={() => onOpen({ gameId: "lol", gameName: p.gameName, tagLine: p.tagLine, region })}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.gameName} #${p.tagLine}`}
                >
                  <View style={styles.badge}><GameLogo game="lol" size={sizes.avatarXs} color={accents.lol} /></View>
                  <View style={styles.text}>
                    <Text style={styles.name} numberOfLines={1}>{p.gameName}<Text style={styles.tag}> #{p.tagLine}</Text></Text>
                    <Text style={styles.sub}>{t("suggested.lp", { lp: formatNumber(p.leaguePoints) })}</Text>
                  </View>
                </Pressable>
                <PressableScale
                  onPress={() => toggle(p)}
                  scaleTo={0.9}
                  style={styles.star}
                  accessibilityRole="button"
                  accessibilityState={{ selected: fav }}
                  accessibilityLabel={fav ? t("suggested.remove", { name: p.gameName }) : t("suggested.add", { name: p.gameName })}
                >
                  <FavoriteStar active={fav} size={sizes.item} />
                </PressableScale>
              </View>
            );
          })}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:    { marginTop: spacing.lg },
  label:   { marginBottom: spacing.sm },
  card:    { paddingVertical: spacing.xs, paddingHorizontal: 0 },
  row:     { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, minHeight: sizes.placement + spacing.sm },
  divider: { borderTopWidth: sizes.hairline, borderTopColor: colors.border },
  main:    { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  badge:   {
    width: sizes.avatarMd, height: sizes.avatarMd, borderRadius: radii.pill, alignItems: "center", justifyContent: "center",
    backgroundColor: withAlpha(accents.lol, 0.12), borderWidth: sizes.hairline, borderColor: withAlpha(accents.lol, 0.35),
  },
  text:    { flex: 1 },
  name:    { ...type.bodyStrong, color: colors.text },
  tag:     { ...type.small, color: colors.textMuted },
  sub:     { ...type.small, color: colors.textMuted, marginTop: spacing.xxs },
  star:    { width: sizes.placement, height: sizes.placement, alignItems: "center", justifyContent: "center" },
});
