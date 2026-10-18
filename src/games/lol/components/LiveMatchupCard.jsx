import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card, PressableScale } from "../../../components/ui";
import Icon from "../../../components/Icon";
import Mini from "./Mini";
import { championByKey, championIcon, championLabel } from "../../../api/ddragon";
import { POSITION_KEYS, championPositions, laneOpponent } from "../matchup";
import { useT } from "../../../i18n/I18nProvider";
import { colors, fontSizes, radii, sizes, spacing, type, useAccent, withAlpha } from "../../../theme";

const nameOf = key => { const c = championByKey(key); return c ? championLabel(c.name) : "?"; };
const iconOf = key => { const c = championByKey(key); return c ? championIcon(c.name) : null; };

/**
 * Atajo de Partida en vivo a Enfrentamientos: "Cómo jugar contra X" con el rival de línea del jugador. La API de
 * partidas en vivo no dice posiciones, así que se deduce (ver laneOpponent); si no queda claro, se elige entre los
 * cinco rivales. Solo en la Grieta del Invocador (en ARAM o Arena no hay líneas).
 *  - me: participante del jugador · enemies: participantes del otro equipo · onOpen({ championId, enemyId })
 */
export default function LiveMatchupCard({ me, enemies, onOpen }) {
  const t = useT();
  const accent = useAccent("lol");
  const [lane, setLane] = useState(undefined);   // undefined = cargando · null = no se sabe · { enemy, position }

  const enemyKey = enemies.map(e => e.championId).join(",");
  useEffect(() => {
    let alive = true;
    championPositions()
      .then(positions => { if (alive) setLane(laneOpponent(me, enemies, positions)); })
      .catch(() => { if (alive) setLane(null); });
    return () => { alive = false; };
  }, [me?.championId, me?.spell1Id, me?.spell2Id, enemyKey]);

  if (!me?.championId || !enemies.length || lane === undefined) return null;
  const open = enemyId => onOpen({ championId: me.championId, enemyId });

  if (lane) {
    const foe = lane.enemy.championId;
    return (
      <PressableScale onPress={() => open(foe)} accessibilityRole="button" style={styles.wrap}>
        <Card style={[styles.card, { borderColor: withAlpha(accent, 0.35) }]}>
          <Mini uri={iconOf(foe)} size={sizes.avatarLg} style={[styles.foe, { borderColor: colors.loss }]} />
          <View style={styles.text}>
            <Text style={styles.title} numberOfLines={1}>{t("matchup.liveTitle", { name: nameOf(foe) })}</Text>
            <Text style={styles.sub} numberOfLines={2}>{t("matchup.liveSub", { position: t(POSITION_KEYS[lane.position]) })}</Text>
          </View>
          <Icon name="chevron" size={fontSizes.base} color={colors.textMuted} />
        </Card>
      </PressableScale>
    );
  }

  return (
    <Card style={[styles.pick, styles.wrap]}>
      <Text style={styles.title}>{t("matchup.livePick")}</Text>
      <View style={styles.row}>
        {enemies.map((e, i) => (
          <PressableScale
            key={e.puuid || `${e.championId}-${i}`}
            onPress={() => open(e.championId)}
            style={styles.option}
            accessibilityRole="button"
            accessibilityLabel={t("matchup.liveTitle", { name: nameOf(e.championId) })}
          >
            <Mini uri={iconOf(e.championId)} size={sizes.avatarMd} />
            <Text style={styles.optionName} numberOfLines={1}>{nameOf(e.championId)}</Text>
          </PressableScale>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap:       { marginBottom: spacing.lg },
  card:       { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderWidth: sizes.hairline },
  foe:        { borderWidth: 2, borderRadius: radii.md },
  text:       { flex: 1, minWidth: 0 },
  title:      { ...type.bodyStrong, color: colors.text },
  sub:        { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
  pick:       { padding: spacing.md },
  row:        { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm },
  option:     { flex: 1, alignItems: "center", gap: spacing.xxs },
  optionName: { ...type.micro, color: colors.textMuted },
});
