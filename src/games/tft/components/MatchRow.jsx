import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import UnitIcon from "./UnitIcon";
import TraitBadge from "./TraitBadge";
import { SectionLabel } from "../../../components/ui";
import { tftAugment } from "../assets";
import {
  activeTraits, participantName, placementColor, placementLabel, queueLabel,
} from "../utils";
import { timeSince, formatDuration } from "../../../utils/format";
import { colors, radii, sizes, spacing, fontSizes, type, useAccent } from "../../../theme";

function PlacementBox({ placement, size = sizes.placement }) {
  const color = placementColor(placement);
  return (
    <View style={[styles.placementBox, { width: size, height: size, borderColor: color }]}>
      <Text style={[size === sizes.placement ? styles.placementNum : styles.placementSmall, { color }]}>#{placement}</Text>
    </View>
  );
}

// Fila de una partida de TFT: posición final, cola, rasgos y unidades. Al tocarla muestra a los 8 jugadores.
export default function TftMatchRow({ match, puuid, expanded, onPress }) {
  const accent = useAccent("tft");
  const info = match?.info;
  const me = info?.participants?.find(p => p.puuid === puuid);
  if (!me) return null;

  const color  = placementColor(me.placement);
  const traits = activeTraits(me.traits);
  const units  = [...(me.units || [])].sort((a, b) => b.tier - a.tier);

  return (
    <View>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={[styles.row, { borderLeftColor: color, backgroundColor: expanded ? colors.surface : colors.bg }]}
      >
        <PlacementBox placement={me.placement} />
        <View style={styles.main}>
          <View style={styles.titleRow}>
            <Text style={[styles.label, { color }]}>{placementLabel(me.placement)}</Text>
            <Text style={styles.meta}>{queueLabel(info.queue_id)} · {formatDuration(info.game_length)} · {timeSince(info.game_datetime)}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip}>
            {traits.slice(0, 6).map(t => <TraitBadge key={t.name} trait={t} size={sizes.avatarSm} />)}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip}>
            {units.map((u, i) => <UnitIcon key={`${u.character_id}${i}`} unit={u} size={sizes.avatarSm} />)}
          </ScrollView>
        </View>
        <View style={styles.right}>
          <Text style={[styles.level, { color }]}>Nv. {me.level}</Text>
          <Text style={styles.dmg}>{me.total_damage_to_players} dmg</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.detail}>
          <SectionLabel>Todos los jugadores</SectionLabel>
          {[...info.participants].sort((a, b) => a.placement - b.placement).map(p => {
            const isMe = p.puuid === puuid;
            return (
              <View key={p.puuid} style={[styles.player, isMe && { backgroundColor: colors.surfaceRaised, borderLeftColor: accent }]}>
                <PlacementBox placement={p.placement} size={sizes.avatarSm} />
                <View style={styles.main}>
                  <Text style={[styles.playerName, isMe && { color: accent }]} numberOfLines={1}>
                    {isMe ? "Tú · " : ""}{participantName(p)}
                  </Text>
                  <Text style={styles.playerMeta}>
                    Nivel {p.level} · {p.total_damage_to_players} dmg{p.augments?.length ? ` · ${p.augments.map(a => tftAugment(a).name).join(", ")}` : ""}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip}>
                    {[...(p.units || [])].sort((a, b) => b.tier - a.tier).map((u, i) => (
                      <UnitIcon key={`${u.character_id}${i}`} unit={u} size={sizes.item} />
                    ))}
                  </ScrollView>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row:          {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    padding: spacing.md, borderLeftWidth: sizes.borderAccent, borderRadius: radii.md, marginBottom: spacing.xs,
  },
  placementBox: { borderRadius: radii.md, borderWidth: sizes.borderThick, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  placementNum: { ...type.stat, fontSize: fontSizes.lg },
  placementSmall: { ...type.label, fontSize: fontSizes.sm },
  main:         { flex: 1 },
  titleRow:     { gap: spacing.xxs },
  label:        { ...type.label, fontSize: fontSizes.sm },
  meta:         { ...type.caption, color: colors.textMuted },
  strip:        { marginTop: spacing.sm },
  right:        { alignItems: "flex-end" },
  level:        { ...type.bodyStrong },
  dmg:          { ...type.caption, color: colors.textMuted },
  detail:       {
    backgroundColor: colors.bg, borderWidth: sizes.hairline, borderColor: colors.border,
    borderRadius: radii.md, marginBottom: spacing.sm, padding: spacing.md,
  },
  player:       {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radii.sm,
    borderLeftWidth: sizes.borderThick, borderLeftColor: "transparent", marginBottom: spacing.xs,
  },
  playerName:   { ...type.smallStrong, color: colors.textSecondary },
  playerMeta:   { ...type.caption, color: colors.textMuted },
});
