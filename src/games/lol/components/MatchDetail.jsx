import React, { useState } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { championIcon, itemIcon } from "../../../api/ddragon";
import { spellIcon, perkIcon, perksOf } from "../assets";
import { csOf, playerName } from "../utils";
import { formatDuration } from "../../../utils/format";
import { colors, radii, sizes, spacing, fontSizes, type, tracking, useAccent } from "../../../theme";

// Ícono pequeño con placeholder si falta o falla la imagen
function Mini({ uri, size, round }) {
  const [failed, setFailed] = useState(false);
  const style = [{ width: size, height: size, borderRadius: round ? size / 2 : radii.xs, backgroundColor: colors.surfaceHigh }];
  if (!uri || failed) return <View style={style} />;
  return <Image source={{ uri }} style={style} onError={() => setFailed(true)} />;
}

function ItemIcon({ itemId }) {
  return <Mini uri={itemId ? itemIcon(itemId) : null} size={sizes.item} />;
}

// Hechizos de invocador (2) y runas (piedra angular + estilo secundario)
function Loadout({ p }) {
  const { keystone, secondary } = perksOf(p);
  return (
    <View style={styles.loadout}>
      <View style={styles.loadoutCol}>
        <Mini uri={spellIcon(p.summoner1Id)} size={sizes.avatarXs - spacing.xxs} />
        <Mini uri={spellIcon(p.summoner2Id)} size={sizes.avatarXs - spacing.xxs} />
      </View>
      <View style={styles.loadoutCol}>
        <Mini uri={perkIcon(keystone)} size={sizes.avatarXs - spacing.xxs} round />
        <Mini uri={perkIcon(secondary)} size={sizes.avatarXs - spacing.xxs} round />
      </View>
    </View>
  );
}

function PlayerRow({ p, isMe, maxDmg, accent }) {
  const dmgPct = (p.totalDamageDealtToChampions / maxDmg) * 100;
  const items  = [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6];

  return (
    <View style={[styles.playerRow, isMe && { backgroundColor: colors.surfaceRaised, borderLeftColor: accent }]}>
      <Image source={{ uri: championIcon(p.championName) }} style={styles.champImg} />
      <Loadout p={p} />
      <View style={styles.playerInfo}>
        <Text style={[styles.playerName, isMe && { color: accent }]} numberOfLines={1}>
          {playerName(p)}
        </Text>
        <View style={styles.itemsRow}>
          {items.map((id, i) => <ItemIcon key={i} itemId={id} />)}
        </View>
        <View style={styles.dmgBarBg}>
          <View style={[styles.dmgBarFill, {
            width: `${dmgPct}%`,
            backgroundColor: p.win ? colors.win : colors.loss,
          }]} />
        </View>
      </View>
      <View style={styles.statsCol}>
        <Text style={styles.kdaText}>{p.kills}/{p.deaths}/{p.assists}</Text>
        <Text style={styles.dmgNum}>{Math.round(p.totalDamageDealtToChampions / 1000)}k dmg</Text>
        <Text style={[styles.goldNum, { color: accent }]}>🪙 {Math.round(p.goldEarned / 1000)}k</Text>
        <Text style={styles.csNum}>{csOf(p)} CS</Text>
      </View>
    </View>
  );
}

export default function MatchDetail({ match, myPuuid }) {
  const accent = useAccent("lol");
  if (!match?.info) return null;
  const { participants, gameDuration } = match.info;
  const team1  = participants.filter(p => p.teamId === 100);
  const team2  = participants.filter(p => p.teamId === 200);
  const maxDmg = Math.max(1, ...participants.map(p => p.totalDamageDealtToChampions));

  const teamKills = team => team.reduce((a, p) => a + p.kills, 0);
  const team1Win  = team1[0]?.win;
  const resultColor = win => (win ? colors.win : colors.loss);

  return (
    <View style={styles.container}>
      <View style={styles.teamSummary}>
        <View style={styles.teamStat}>
          <Text style={[styles.teamStatVal, { color: resultColor(team1Win) }]}>{teamKills(team1)}</Text>
          <Text style={styles.teamStatLabel}>kills</Text>
        </View>
        <Text style={styles.vs}>VS</Text>
        <View style={styles.teamStat}>
          <Text style={[styles.teamStatVal, { color: resultColor(team2[0]?.win) }]}>{teamKills(team2)}</Text>
          <Text style={styles.teamStatLabel}>kills</Text>
        </View>
      </View>

      {[{ team: team1, win: team1Win }, { team: team2, win: !team1Win }].map(({ team, win }, ti) => (
        <View key={ti} style={[styles.teamBlock, ti === 0 && styles.teamBorder]}>
          <Text style={[styles.teamLabel, { color: resultColor(win) }]}>
            {win ? "✓ VICTORIA" : "✗ DERROTA"} · Equipo {ti + 1}
          </Text>
          {team.map(p => (
            <PlayerRow key={p.puuid} p={p} isMe={p.puuid === myPuuid} maxDmg={maxDmg} accent={accent} />
          ))}
        </View>
      ))}
      <Text style={styles.duration}>⏱ Duración: {formatDuration(gameDuration)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    {
    backgroundColor: colors.bg,
    borderWidth: sizes.hairline, borderColor: colors.border,
    borderRadius: radii.md, overflow: "hidden", marginBottom: spacing.sm,
  },
  teamSummary:  {
    flexDirection: "row", justifyContent: "center", alignItems: "center", gap: spacing.xl,
    padding: spacing.md, borderBottomWidth: sizes.hairline, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  teamStat:     { alignItems: "center" },
  teamStatVal:  { ...type.statLarge },
  teamStatLabel:{ ...type.micro, color: colors.textMuted },
  vs:           { ...type.label, color: colors.textFaint, fontSize: fontSizes.sm },
  teamBlock:    { padding: spacing.md },
  teamBorder:   { borderBottomWidth: sizes.hairline, borderBottomColor: colors.border },
  teamLabel:    { ...type.label, fontSize: fontSizes.xs, letterSpacing: tracking.wide, marginBottom: spacing.sm },
  playerRow:    {
    flexDirection: "row", alignItems: "center",
    gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm,
    borderRadius: radii.sm, borderLeftWidth: sizes.borderThick, borderLeftColor: "transparent",
    marginBottom: spacing.xs,
  },
  champImg:     { width: sizes.avatarSm, height: sizes.avatarSm, borderRadius: radii.xs, backgroundColor: colors.surfaceHigh },
  loadout:      { flexDirection: "row", gap: spacing.xxs },
  loadoutCol:   { gap: spacing.xxs },
  playerInfo:   { flex: 1, gap: spacing.xs },
  playerName:   { ...type.caption, color: colors.textSecondary },
  itemsRow:     { flexDirection: "row", gap: spacing.xxs },
  dmgBarBg:     { height: sizes.barThin, backgroundColor: colors.surfaceHigh, borderRadius: radii.pill, width: "90%" },
  dmgBarFill:   { height: "100%", borderRadius: radii.pill },
  statsCol:     { alignItems: "flex-end", gap: spacing.xxs },
  kdaText:      { ...type.smallStrong, color: colors.text },
  dmgNum:       { ...type.micro, color: colors.loss },
  goldNum:      { ...type.micro },
  csNum:        { ...type.micro, color: colors.textMuted },
  duration:     { ...type.caption, textAlign: "center", color: colors.textMuted, padding: spacing.sm },
});
