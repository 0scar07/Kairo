import React, { useEffect, useLayoutEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Card, Chip, EmptyState, ErrorState, PressableScale, Skeleton } from "../../components/ui";
import Mini from "./components/Mini";
import { championByKey, championIcon, championLabel, itemIcon } from "../../api/ddragon";
import { ensureLolAssets, perkIcon, spellIcon } from "./assets";
import { POSITION_KEYS, getMatchup, isCompleted, loadAbilities, loadItems, loadRuneNames } from "./matchup";
import { errorMessage, formatNumber, winrate } from "../../utils/format";
import { useT } from "../../i18n/I18nProvider";
import { select } from "../../utils/haptics";
import { accents, colors, fontSizes, radii, sizes, spacing, type, winrateColor, withAlpha } from "../../theme";

const GOLD = accents.lol;
const SKILL_COLORS = { Q: GOLD, W: colors.info, E: colors.win, R: colors.loss };
const nameOf = key => { const c = championByKey(key); return c ? championLabel(c.name) : "?"; };
const iconOf = key => { const c = championByKey(key); return c ? championIcon(c.name) : null; };
const pct = (wins, games) => winrate(wins, games - wins);

/**
 * Enfrentamiento: tu campeón contra un rival. Arriba, cómo le va en ese cruce; en pestañas, la build que más gana
 * contra ese rival (o la general si hay pocas partidas, y lo dice), runas, hechizos y orden de habilidades; las
 * habilidades del rival con su enfriamiento y su tipo de daño; y los counters del campeón en su línea.
 * Las cifras son de partidas de Challenger que junta el servidor; cada una dice cuántas partidas la respaldan.
 *  - params: { championId, enemyId }
 */
export default function MatchupScreen({ route, navigation }) {
  const t = useT();
  const { championId, enemyId } = route.params;
  const [state, setState] = useState({ status: "loading" });
  const [tab, setTab] = useState("build");
  const [attempt, setAttempt] = useState(0);

  useLayoutEffect(() => { navigation.setOptions({ title: `${nameOf(championId)} vs ${nameOf(enemyId)}` }); }, [championId, enemyId]);

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    Promise.all([
      getMatchup(championId, enemyId),
      loadItems().catch(() => null),
      loadRuneNames().catch(() => ({})),
      loadAbilities(championId).catch(() => []),
      loadAbilities(enemyId).catch(() => []),
      ensureLolAssets(),
    ])
      .then(([data, items, runes, mine, foe]) => { if (alive) setState({ status: "ready", data, items, runes, mine, foe }); })
      .catch(e => { if (alive) setState({ status: e?.response?.status === 404 ? "empty" : "error", message: errorMessage(e) }); });
    return () => { alive = false; };
  }, [championId, enemyId, attempt]);

  if (state.status === "loading") {
    return (
      <View style={styles.container}><View style={styles.content}>
        <Skeleton height={sizes.iconHero + spacing.xxl} radius={radii.lg} style={styles.gap} />
        <Skeleton height={sizes.chart * 2} radius={radii.lg} style={styles.gap} />
        <Skeleton height={sizes.chart * 2} radius={radii.lg} />
      </View></View>
    );
  }
  if (state.status === "error") return <View style={styles.center}><ErrorState message={state.message} onRetry={() => setAttempt(n => n + 1)} /></View>;
  if (state.status === "empty") return <View style={styles.center}><EmptyState icon="barChart" title={t("matchup.noDataTitle")} text={t("matchup.noDataText")} /></View>;

  const { data, items, runes, mine, foe } = state;
  const m = data.matchup;
  const wr = m.games ? pct(m.wins, m.games) : null;
  const build = (data.items.list || []).filter(i => !items || isCompleted(items, i.id)).slice(0, 6);
  const position = data.position ? t(POSITION_KEYS[data.position]) : null;
  const tabs = [
    { key: "build", label: t("matchup.tabBuild") },
    { key: "foe", label: t("matchup.tabAbilities", { name: nameOf(enemyId) }) },
    { key: "counters", label: t("matchup.tabCounters") },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.vs}>
        <Side champKey={championId} sub={position ? t("matchup.youAt", { position }) : t("matchup.you")} tone={GOLD} />
        <View style={styles.mid}>
          <Text style={[styles.wr, { color: wr == null ? colors.textMuted : winrateColor(wr, GOLD) }]}>{wr == null ? "—" : `${wr}%`}</Text>
          <Text style={styles.midSub}>{m.games ? t("matchup.winsIn", { count: m.games }) : t("matchup.noGamesYet")}</Text>
          <PressableScale
            onPress={() => { select(); navigation.setParams({ championId: enemyId, enemyId: championId }); }}
            style={styles.swap}
            accessibilityRole="button"
          >
            <Text style={styles.swapText}>⇄ {t("matchup.swap")}</Text>
          </PressableScale>
        </View>
        <Side champKey={enemyId} sub={t("matchup.rival")} tone={colors.loss} />
      </Card>

      <View style={styles.tabs}>
        {tabs.map(x => <Chip key={x.key} label={x.label} active={tab === x.key} onPress={() => setTab(x.key)} game="lol" />)}
      </View>

      {tab === "build" ? (
        <>
          <Header
            title={data.items.general ? t("matchup.buildGeneral", { name: nameOf(championId) }) : t("matchup.buildVs", { name: nameOf(enemyId) })}
            note={data.items.general ? t("matchup.fewGames") : t("matchup.games", { count: m.games })}
          />
          <Card style={styles.block}>
            {build.length ? (
              <View style={styles.items}>
                {build.map((it, i) => (
                  <React.Fragment key={it.id}>
                    {i > 0 ? <Text style={styles.arrow}>›</Text> : null}
                    <View style={styles.item} accessible accessibilityLabel={`${items?.[it.id]?.name || it.id}, ${pct(it.wins, it.games)}%`}>
                      <Mini uri={itemIcon(it.id)} size={sizes.avatarMd} />
                      <Text style={styles.itemPct}>{pct(it.wins, it.games)}%</Text>
                    </View>
                  </React.Fragment>
                ))}
              </View>
            ) : <Text style={styles.note}>{t("matchup.noItems")}</Text>}
            {data.keystones[0] || data.spells[0] ? (
              <View style={styles.runes}>
                {data.keystones[0] ? <Mini uri={perkIcon(data.keystones[0].id)} size={sizes.avatarMd - spacing.xs} round /> : null}
                <Text style={styles.runeName} numberOfLines={1}>{data.keystones[0] ? runes[data.keystones[0].id] || "" : ""}</Text>
                <View style={styles.spells}>
                  {(data.spells[0]?.ids || []).map(id => <Mini key={id} uri={spellIcon(id)} size={sizes.avatarSm} />)}
                </View>
              </View>
            ) : null}
          </Card>

          {data.skills.max ? (
            <>
              <Header title={t("matchup.skills")} note={t("matchup.maxOrder", { order: data.skills.max.key.split("").join(" › ") })} />
              <Card style={styles.block}>
                <View style={styles.skills}>
                  {data.skills.max.key.split("").map((k, i) => {
                    const ab = mine.find(a => a.key === k);
                    return (
                      <View key={k} style={styles.skill}>
                        <Mini uri={ab?.icon} size={sizes.avatarSm + spacing.xxs} />
                        <View><Text style={[styles.skillKey, { color: SKILL_COLORS[k] }]}>{k}</Text><Text style={styles.skillNth}>{t("matchup.nth", { n: i + 1 })}</Text></View>
                      </View>
                    );
                  })}
                </View>
                {data.skills.sequence ? (
                  <View style={styles.order} accessible accessibilityLabel={data.skills.sequence.key.split("").join(", ")}>
                    {data.skills.sequence.key.split("").map((k, i) => (
                      <View key={i} style={[styles.lv, { backgroundColor: withAlpha(SKILL_COLORS[k] || colors.surfaceHigh, 0.22) }]}>
                        <Text style={[styles.lvText, { color: SKILL_COLORS[k] }]}>{k}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                <Text style={styles.note}>{t("matchup.skillsNote", { count: formatNumber(data.skills.max.games) })}</Text>
              </Card>
            </>
          ) : null}
        </>
      ) : null}

      {tab === "foe" ? (
        <>
          <Header title={t("matchup.dodge", { name: nameOf(enemyId) })} />
          <Card style={styles.flush}>
            {foe.map((a, i) => (
              <View key={a.key} style={[styles.ab, i > 0 && styles.divider]}>
                <Mini uri={a.icon} size={sizes.avatarMd} />
                <View style={styles.abText}>
                  <Text style={styles.abName}><Text style={{ color: SKILL_COLORS[a.key] }}>{a.key}</Text> · {a.name}</Text>
                  <Text style={styles.abDesc} numberOfLines={3}>{a.text}</Text>
                </View>
                {a.cooldown ? <Text style={styles.cd}>{a.cooldown} s</Text> : null}
              </View>
            ))}
          </Card>
          {data.enemyDamage ? (
            <>
              <Header title={t("matchup.damage", { name: nameOf(enemyId) })} note={t("matchup.games", { count: data.enemyDamage.games })} />
              <Card style={styles.block}>
                <View style={styles.dmgLabels}>
                  <Text style={[styles.dmgLabel, { color: colors.loss }]}>{t("matchup.physical")} {Math.round(data.enemyDamage.physical * 100)}%</Text>
                  <Text style={[styles.dmgLabel, { color: colors.info }]}>{t("matchup.magic")} {Math.round(data.enemyDamage.magic * 100)}%</Text>
                  <Text style={[styles.dmgLabel, { color: colors.textSecondary }]}>{t("matchup.true")} {Math.round(data.enemyDamage.true * 100)}%</Text>
                </View>
                <View style={styles.dmgBar}>
                  <View style={{ flex: data.enemyDamage.physical, backgroundColor: colors.loss }} />
                  <View style={{ flex: data.enemyDamage.magic, backgroundColor: colors.info }} />
                  <View style={{ flex: data.enemyDamage.true, backgroundColor: colors.textSecondary }} />
                </View>
              </Card>
            </>
          ) : null}
          <Text style={styles.source}>{t("matchup.abilitiesSource")}</Text>
        </>
      ) : null}

      {tab === "counters" ? (
        <>
          <Header title={t("matchup.countersOf", { name: nameOf(championId), position: position || "" })} />
          {data.counters.beats.length || data.counters.losesTo.length ? (
            <Card style={styles.block}>
              <CounterRow label={t("matchup.beats")} color={colors.win} list={data.counters.beats} onOpen={key => navigation.push("Matchup", { championId, enemyId: key })} />
              <CounterRow label={t("matchup.losesTo")} color={colors.loss} list={data.counters.losesTo} onOpen={key => navigation.push("Matchup", { championId, enemyId: key })} />
            </Card>
          ) : <Text style={styles.note}>{t("matchup.noCounters")}</Text>}
        </>
      ) : null}

      <Text style={styles.source}>{t("matchup.source")} · {t("matchup.patches", { patches: (data.patches || []).join(", ") })}</Text>
    </ScrollView>
  );
}

function Side({ champKey, sub, tone }) {
  return (
    <View style={styles.side}>
      <Mini uri={iconOf(champKey)} size={sizes.avatarXl} style={[styles.sideImg, { borderColor: tone }]} />
      <Text style={styles.sideName} numberOfLines={1}>{nameOf(champKey)}</Text>
      <Text style={styles.sideSub} numberOfLines={1}>{sub}</Text>
    </View>
  );
}

function Header({ title, note }) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      {note ? <Text style={styles.headerNote}>{note}</Text> : null}
    </View>
  );
}

function CounterRow({ label, color, list, onOpen }) {
  if (!list.length) return null;
  return (
    <View style={styles.counterBlock}>
      <Text style={[styles.counterLabel, { color }]}>{label}</Text>
      <View style={styles.counters}>
        {list.map(c => (
          <PressableScale key={c.championId} onPress={() => onOpen(c.championId)} style={styles.counter} accessibilityRole="button" accessibilityLabel={`${nameOf(c.championId)}, ${pct(c.wins, c.games)}%`}>
            <Mini uri={iconOf(c.championId)} size={sizes.avatarLg + spacing.xs} />
            <Text style={[styles.counterPct, { color }]}>{pct(c.wins, c.games)}%</Text>
            <Text style={styles.counterName} numberOfLines={1}>{nameOf(c.championId)}</Text>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg },
  content:     { padding: spacing.lg, paddingBottom: spacing.hero },
  center:      { flex: 1, backgroundColor: colors.bg, justifyContent: "center" },
  gap:         { marginBottom: spacing.lg },
  vs:          { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.lg },
  side:        { width: sizes.iconHero + spacing.md, alignItems: "center" },
  sideImg:     { borderWidth: 2, borderRadius: radii.lg },
  sideName:    { ...type.bodyStrong, color: colors.text, marginTop: spacing.sm },
  sideSub:     { ...type.caption, color: colors.textMuted },
  mid:         { flex: 1, alignItems: "center" },
  wr:          { ...type.statLarge, fontSize: fontSizes.hero, fontVariant: ["tabular-nums"] },
  midSub:      { ...type.caption, color: colors.textMuted, textAlign: "center" },
  swap:        { marginTop: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  swapText:    { ...type.captionStrong, color: GOLD },
  tabs:        { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.sm, marginTop: spacing.lg },
  header:      { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.sm },
  headerTitle: { ...type.smallStrong, color: colors.textSecondary, flexShrink: 1 },
  headerNote:  { ...type.caption, color: colors.textMuted, fontVariant: ["tabular-nums"] },
  block:       { padding: spacing.md },
  flush:       { padding: 0 },
  items:       { flexDirection: "row", alignItems: "flex-start", flexWrap: "wrap", rowGap: spacing.sm },
  item:        { alignItems: "center", gap: spacing.xxs },
  itemPct:     { ...type.micro, color: colors.textMuted, fontVariant: ["tabular-nums"] },
  arrow:       { ...type.body, color: colors.textMuted, marginHorizontal: spacing.xs, marginTop: spacing.sm },
  runes:       { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  runeName:    { ...type.bodyStrong, color: colors.text, flex: 1 },
  spells:      { flexDirection: "row", gap: spacing.xs },
  skills:      { flexDirection: "row", gap: spacing.sm },
  skill:       { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surfaceRaised },
  skillKey:    { ...type.heading },
  skillNth:    { ...type.micro, color: colors.textMuted },
  order:       { flexDirection: "row", gap: spacing.xxs, marginTop: spacing.md },
  lv:          { flex: 1, height: sizes.item, borderRadius: radii.xs, alignItems: "center", justifyContent: "center" },
  lvText:      { ...type.captionStrong },
  note:        { ...type.caption, color: colors.textMuted, marginTop: spacing.sm },
  ab:          { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, padding: spacing.md },
  divider:     { borderTopWidth: sizes.hairline, borderTopColor: colors.border },
  abText:      { flex: 1 },
  abName:      { ...type.bodyStrong, color: colors.text },
  abDesc:      { ...type.caption, color: colors.textSecondary, marginTop: spacing.xxs },
  cd:          { ...type.captionStrong, color: colors.textMuted, fontVariant: ["tabular-nums"] },
  dmgLabels:   { flexDirection: "row", justifyContent: "space-between" },
  dmgLabel:    { ...type.captionStrong, fontVariant: ["tabular-nums"] },
  dmgBar:      { flexDirection: "row", height: spacing.sm, borderRadius: radii.pill, overflow: "hidden", marginTop: spacing.sm, backgroundColor: colors.surfaceHigh },
  counterBlock:{ marginBottom: spacing.md },
  counterLabel:{ ...type.label, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: spacing.sm },
  counters:    { flexDirection: "row", justifyContent: "space-around" },
  counter:     { alignItems: "center", minWidth: sizes.iconHero - spacing.lg },
  counterPct:  { ...type.smallStrong, marginTop: spacing.xs, fontVariant: ["tabular-nums"] },
  counterName: { ...type.micro, color: colors.textMuted },
  source:      { ...type.micro, color: colors.textMuted, marginTop: spacing.lg },
});
