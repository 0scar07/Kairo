import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable } from "react-native";
import { Chip, PressableScale, RowSkeleton } from "../../../components/ui";
import Icon from "../../../components/Icon";
import Mini from "./Mini";
import { allChampions, championByKey, championIcon, championId, championLabel } from "../../../api/ddragon";
import { POSITIONS, POSITION_KEYS, getOpponents, getPopularMatchups } from "../matchup";
import { loadMainChampion } from "../../../utils/prefs";
import { winrate } from "../../../utils/format";
import { useT } from "../../../i18n/I18nProvider";
import { select } from "../../../utils/haptics";
import { colors, fontSizes, radii, sizes, spacing, type, winrateColor, withAlpha, accents } from "../../../theme";

const iconOf = key => { const c = championByKey(key); return c ? championIcon(c.name) : null; };
const labelOf = key => { const c = championByKey(key); return c ? championLabel(c.name) : "?"; };
const MIN_POPULAR = 3;   // un cruce con menos partidas no se sugiere

/**
 * Pestaña "Enfrentamientos" de la lupa: eliges tu campeón y el rival, y se abre la pantalla del cruce. El selector de
 * campeones aparece dentro de la misma hoja (dos hojas encimadas no funcionan bien en Android).
 *  - onOpen({ championId, enemyId }) abre la pantalla Enfrentamiento
 */
export default function MatchupsTab({ visible, onOpen }) {
  const t = useT();
  const [mine, setMine] = useState(null);       // ID numérico de tu campeón
  const [position, setPosition] = useState("MIDDLE");
  const [picking, setPicking] = useState(null); // null | "mine" | "foe"
  const [popular, setPopular] = useState({ status: "loading", list: [] });

  // Tu campeón por defecto: el que más juegas en Mi perfil de LoL
  useEffect(() => {
    loadMainChampion("lol").then(name => {
      if (!name || mine) return;
      const id = championId(name);
      const c = allChampions().find(x => x.id === id);
      if (c) setMine(c.key);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    let alive = true;
    setPopular({ status: "loading", list: [] });
    getPopularMatchups(position)
      .then(list => { if (alive) setPopular({ status: "ready", list: list.filter(m => m.games >= MIN_POPULAR) }); })
      .catch(() => { if (alive) setPopular({ status: "error", list: [] }); });
    return () => { alive = false; };
  }, [visible, position]);

  if (picking) {
    return (
      <ChampionPicker
        title={picking === "foe" && mine ? t("matchup.against", { name: labelOf(mine) }) : t("matchup.pickYours")}
        mine={picking === "foe" ? mine : null}
        position={position}
        onBack={() => setPicking(null)}
        onPick={key => {
          select();
          if (picking === "mine") { setMine(key); setPicking(null); return; }
          setPicking(null);
          onOpen({ championId: mine, enemyId: key });
        }}
      />
    );
  }

  return (
    <View>
      <View style={styles.picker}>
        <Slot champKey={mine} label={t("matchup.yours")} hint={t("matchup.choose")} onPress={() => setPicking("mine")} tone={accents.lol} />
        <View style={styles.vs}><Text style={styles.vsText}>VS</Text></View>
        <Slot champKey={null} label={t("matchup.rival")} hint={mine ? t("matchup.choose") : t("matchup.pickYoursFirst")} onPress={() => (mine ? setPicking("foe") : setPicking("mine"))} tone={colors.loss} />
      </View>

      <View style={styles.positions}>
        {POSITIONS.map(p => <Chip key={p} label={t(POSITION_KEYS[p])} active={position === p} onPress={() => setPosition(p)} game="lol" />)}
      </View>

      <Text style={styles.sec}>{t("matchup.popular", { position: t(POSITION_KEYS[position]) })}</Text>
      {popular.status === "loading" ? <><RowSkeleton /><RowSkeleton /></> : null}
      {popular.status !== "loading" && !popular.list.length ? <Text style={styles.empty}>{t("matchup.noPopular")}</Text> : null}
      {popular.list.length ? (
        <View style={styles.card}>
          {popular.list.slice(0, 6).map((m, i) => {
            const wr = winrate(m.wins, m.games - m.wins);
            return (
              <Pressable
                key={`${m.championId}-${m.enemyId}`}
                onPress={() => { select(); onOpen({ championId: m.championId, enemyId: m.enemyId }); }}
                style={({ pressed }) => [styles.mu, i > 0 && styles.divider, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`${labelOf(m.championId)} vs ${labelOf(m.enemyId)}, ${wr}%`}
              >
                <Mini uri={iconOf(m.championId)} size={sizes.avatarSm} />
                <Text style={styles.x}>vs</Text>
                <Mini uri={iconOf(m.enemyId)} size={sizes.avatarSm} />
                <Text style={styles.muName} numberOfLines={1}>{labelOf(m.championId)} vs {labelOf(m.enemyId)}</Text>
                <Text style={[styles.muWr, { color: winrateColor(wr, accents.lol) }]}>{wr}%</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <Text style={styles.source}>{t("matchup.source")}</Text>
    </View>
  );
}

function Slot({ champKey, label, hint, onPress, tone }) {
  const c = champKey ? championByKey(champKey) : null;
  return (
    <PressableScale onPress={onPress} scaleTo={0.95} style={styles.slot} accessibilityRole="button" accessibilityLabel={c ? `${label}: ${championLabel(c.name)}` : `${label}: ${hint}`}>
      {c ? (
        <Mini uri={championIcon(c.name)} size={sizes.avatarXl} style={[styles.slotImg, { borderColor: tone }]} />
      ) : (
        <View style={[styles.slotEmpty, { borderColor: withAlpha(tone, 0.6) }]}><Icon name="plus" size={fontSizes.xxl} color={tone} /></View>
      )}
      <Text style={styles.slotName} numberOfLines={1}>{c ? championLabel(c.name) : label}</Text>
      <Text style={styles.slotHint} numberOfLines={1}>{c ? label : hint}</Text>
    </PressableScale>
  );
}

// Selector de campeón: rivales frecuentes de tu campeón en esa línea (con su winrate) y todos con buscador
function ChampionPicker({ title, mine, position, onBack, onPick }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [frequent, setFrequent] = useState([]);
  const champs = useMemo(() => allChampions(), []);

  useEffect(() => {
    if (!mine) return undefined;
    let alive = true;
    getOpponents(mine, position).then(list => { if (alive) setFrequent(list.filter(o => o.games >= 2).slice(0, 10)); }).catch(() => {});
    return () => { alive = false; };
  }, [mine, position]);

  const q = query.trim().toLowerCase();
  const list = q ? champs.filter(c => c.label.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)) : champs;

  return (
    <View>
      <Pressable onPress={onBack} hitSlop={spacing.md} accessibilityRole="button" style={styles.back}>
        <Icon name="chevron" size={fontSizes.base} color={accents.lol} style={styles.backIcon} />
        <Text style={styles.backText}>{t("explore.title")}</Text>
      </Pressable>
      <Text style={styles.pickTitle}>{title}</Text>
      <View style={styles.search}>
        <Icon name="search" size={fontSizes.lg} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("matchup.searchChampion")}
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoCorrect={false}
          accessibilityLabel={t("matchup.searchChampion")}
        />
      </View>
      {!q && frequent.length ? (
        <>
          <Text style={styles.sec}>{t("matchup.frequent", { name: labelOf(mine), position: t(POSITION_KEYS[position]) })}</Text>
          <View style={styles.grid}>
            {frequent.map(o => {
              const wr = winrate(o.wins, o.games - o.wins);
              return <Cell key={o.championId} champKey={o.championId} onPick={onPick} sub={`${wr}%`} subColor={winrateColor(wr, accents.lol)} />;
            })}
          </View>
        </>
      ) : null}
      <Text style={styles.sec}>{t("matchup.allChampions")}</Text>
      <View style={styles.grid}>
        {list.map(c => <Cell key={c.key} champKey={c.key} onPick={onPick} />)}
      </View>
    </View>
  );
}

function Cell({ champKey, onPick, sub, subColor }) {
  return (
    <Pressable onPress={() => onPick(champKey)} style={({ pressed }) => [styles.cell, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={labelOf(champKey)}>
      <Mini uri={iconOf(champKey)} size={sizes.avatarLg + spacing.md} />
      <Text style={styles.cellName} numberOfLines={1}>{labelOf(champKey)}</Text>
      {sub ? <Text style={[styles.cellSub, { color: subColor }]}>{sub}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  picker:     {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.lg,
    borderRadius: radii.lg, backgroundColor: colors.surfaceRaised, borderWidth: sizes.hairline, borderColor: colors.border,
  },
  slot:       { width: sizes.iconHero + spacing.xl, alignItems: "center" },
  slotImg:    { borderWidth: 2, borderRadius: radii.lg },
  slotEmpty:  { width: sizes.avatarXl, height: sizes.avatarXl, borderRadius: radii.lg, borderWidth: 2, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  slotName:   { ...type.bodyStrong, color: colors.text, marginTop: spacing.sm },
  slotHint:   { ...type.caption, color: colors.textMuted },
  vs:         { width: sizes.placement, height: sizes.placement, borderRadius: radii.pill, backgroundColor: colors.surfaceHigh, alignItems: "center", justifyContent: "center" },
  vsText:     { ...type.smallStrong, color: colors.textSecondary },
  positions:  { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.sm, marginTop: spacing.md },
  sec:        { ...type.smallStrong, color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.sm },
  empty:      { ...type.small, color: colors.textMuted },
  card:       { borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: sizes.hairline, borderColor: colors.border },
  mu:         { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: sizes.placement + spacing.sm, paddingHorizontal: spacing.md },
  divider:    { borderTopWidth: sizes.hairline, borderTopColor: colors.border },
  pressed:    { opacity: 0.7 },
  x:          { ...type.caption, color: colors.textMuted },
  muName:     { ...type.bodyStrong, color: colors.text, flex: 1, marginLeft: spacing.xs },
  muWr:       { ...type.smallStrong, fontVariant: ["tabular-nums"] },
  source:     { ...type.micro, color: colors.textMuted, marginTop: spacing.md },
  back:       { flexDirection: "row", alignItems: "center", gap: spacing.xxs, alignSelf: "flex-start" },
  backIcon:   { transform: [{ rotate: "180deg" }] },
  backText:   { ...type.smallStrong, color: accents.lol },
  pickTitle:  { ...type.title, color: colors.text, marginTop: spacing.sm },
  search:     {
    flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: sizes.button - spacing.xs, marginTop: spacing.md,
    paddingHorizontal: spacing.md, borderRadius: radii.lg, backgroundColor: colors.bg, borderWidth: sizes.hairline, borderColor: colors.border,
  },
  searchInput:{ flex: 1, ...type.body, color: colors.text, paddingVertical: spacing.sm },
  grid:       { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.md },
  cell:       { width: "20%", alignItems: "center" },
  cellName:   { ...type.micro, color: colors.textSecondary, marginTop: spacing.xxs, maxWidth: "92%" },
  cellSub:    { ...type.captionStrong, fontVariant: ["tabular-nums"] },
});
