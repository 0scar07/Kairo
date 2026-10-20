import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Image, ScrollView, Linking, StyleSheet } from "react-native";
import { Chip, ErrorState, PressableScale, Skeleton } from "../components/ui";
import Icon from "../components/Icon";
import { getGameMeta } from "../games/registry";
import { DirBadge, GamePill, Shade } from "./components";
import { fmtLongDate, getArticle } from "./api";
import { useT } from "../i18n/I18nProvider";
import { errorMessage } from "../utils/format";
import { colors, fontSizes, radii, sizes, spacing, type, withAlpha } from "../theme";

/** Una línea de cambio: "Daño: 70 → 115" con ▲/▼, o un texto suelto */
function Line({ line }) {
  if (!line.label && line.before == null) return <Text style={styles.text}>• {line.text}</Text>;
  const tone = line.dir > 0 ? colors.win : line.dir < 0 ? colors.loss : colors.textMuted;
  return (
    <View style={styles.line}>
      <View style={[styles.arrow, { backgroundColor: withAlpha(tone, 0.2) }]}><Text style={[styles.arrowText, { color: tone }]}>{line.dir > 0 ? "▲" : line.dir < 0 ? "▼" : "•"}</Text></View>
      <Text style={styles.lineText}>
        {line.label ? <Text style={styles.lineLabel}>{line.label}: </Text> : null}
        <Text style={styles.before}>{line.before}</Text>
        <Text style={styles.lineText}>  →  </Text>
        <Text style={styles.after}>{line.after}</Text>
      </Text>
    </View>
  );
}

function Groups({ groups, accent }) {
  return groups.map((g, i) => (
    <View key={i} style={styles.group}>
      {g.title ? (
        <View style={styles.groupHead}>
          {g.icon ? <Image source={{ uri: g.icon }} style={styles.groupIcon} /> : <View style={[styles.groupDot, { backgroundColor: accent }]} />}
          <Text style={[styles.groupTitle, { color: accent }]}>{g.title}</Text>
        </View>
      ) : null}
      {g.lines.map((l, j) => <Line key={j} line={l} />)}
    </View>
  ));
}

/** Tarjeta de un campeón u objeto: su arte, el porqué de Riot y sus cambios */
function Entry({ entry, accent, onLayout }) {
  const t = useT();
  const changes = entry.groups.reduce((n, g) => n + g.lines.length, 0);
  return (
    <View style={styles.entry} onLayout={onLayout}>
      <View style={styles.band}>
        {entry.banner ? <Image source={{ uri: entry.banner }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
        <View style={[StyleSheet.absoluteFill, styles.bandShade]} />
        {entry.image ? <Image source={{ uri: entry.image }} style={styles.entryIcon} /> : null}
        <View style={styles.flex}>
          <Text style={styles.entryName} numberOfLines={1}>{entry.name}</Text>
          <Text style={styles.entrySub}>{entry.role || (changes === 1 ? t("news.oneChange") : t("news.changes", { n: changes }))}</Text>
        </View>
        <DirBadge dir={entry.dir} />
      </View>
      {entry.context ? <Text style={[styles.why, { borderLeftColor: accent }]}>{entry.context}</Text> : null}
      <View style={styles.entryBody}><Groups groups={entry.groups} accent={accent} /></View>
    </View>
  );
}

/**
 * Lector de un artículo de Riot dentro de la app (sobre todo notas del parche): cabecera con su arte, cuántos
 * campeones suben y bajan, una pestaña por sección y cada campeón con sus cambios "antes → ahora".
 *  - params: { game, path, section? }   (section: nombre del campeón al que saltar)
 */
export default function ArticleScreen({ route, navigation }) {
  const t = useT();
  const { game, path, section: jumpTo } = route.params;
  const accent = getGameMeta(game)?.accent || colors.text;
  const [state, setState] = useState({ status: "loading" });
  const [tab, setTab] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const scroller = useRef(null);
  const bodyTop = useRef(0);      // posición del cuerpo dentro del scroll
  const sectionTop = useRef(0);   // y de la sección dentro del cuerpo
  const jumped = useRef(false);

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    getArticle(game, path)
      .then(article => { if (alive) setState({ status: "ready", article }); })
      .catch(e => { if (alive) setState({ status: "error", message: errorMessage(e) }); });
    return () => { alive = false; };
  }, [game, path, attempt]);

  const article = state.article;
  // Al llegar desde el póster de un campeón se abre su sección y se baja hasta él
  useEffect(() => {
    if (!article) return;
    const i = jumpTo ? article.sections.findIndex(s => s.entries.some(e => e.name === jumpTo)) : article.sections.findIndex(s => s.entries.length);
    if (i >= 0) setTab(i);
  }, [article]);
  const current = useMemo(() => article?.sections?.[tab], [article, tab]);
  // Las medidas de los padres llegan después que las de los hijos: se espera un instante antes de bajar
  const onEntryLayout = name => e => {
    if (name !== jumpTo || jumped.current) return;
    jumped.current = true;
    const y = e.nativeEvent.layout.y;
    setTimeout(() => scroller.current?.scrollTo({ y: bodyTop.current + sectionTop.current + y - spacing.md, animated: true }), 120);
  };

  const back = (
    <PressableScale onPress={() => navigation.goBack()} hitSlop={spacing.sm} style={styles.round} accessibilityRole="button" accessibilityLabel={t("news.back")}>
      <Icon name="chevron" size={fontSizes.lg} color={colors.text} style={styles.flip} />
    </PressableScale>
  );

  if (state.status === "loading") {
    return (
      <View style={styles.container}>
        <Skeleton height={sizes.chart * 2.1} radius={0} />
        <View style={styles.pad}>{[0, 1, 2].map(i => <Skeleton key={i} height={sizes.chart} radius={radii.lg} style={styles.gap} />)}</View>
        <View style={styles.topbar}>{back}</View>
      </View>
    );
  }
  if (state.status === "error") {
    return <View style={[styles.container, styles.center]}><ErrorState message={state.message} onRetry={() => setAttempt(n => n + 1)} /><View style={styles.topbar}>{back}</View></View>;
  }

  const c = article.counts;
  return (
    <View style={styles.container}>
      <ScrollView ref={scroller} contentContainerStyle={styles.content}>
        <View style={styles.head}>
          {article.image ? <Image source={{ uri: article.image }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
          <Shade from={0.35} mid={0.3} to={1} />
          <View style={styles.headBody}>
            <GamePill game={game} label={t("news.kindPatch")} solid />
            <Text style={styles.title}>{article.title}</Text>
            <Text style={styles.date}>{[fmtLongDate(article.date), t("news.officialSite")].filter(Boolean).join(" · ")}</Text>
          </View>
        </View>

        <View style={styles.pad} onLayout={e => { bodyTop.current = e.nativeEvent.layout.y; }}>
          {article.summary ? <Text style={styles.summary}>{article.summary}</Text> : null}
          {c.champions ? (
            <View style={styles.brief}>
              {[[c.champions, t("news.champions"), colors.text], [c.up, t("news.ups"), colors.win], [c.down, t("news.downs"), colors.loss], ...(c.items ? [[c.items, t("news.items"), colors.text]] : [])].map(([n, label, tone]) => (
                <View key={label} style={styles.briefBox}><Text style={[styles.briefNum, { color: tone }]}>{n}</Text><Text style={styles.briefLabel}>{label}</Text></View>
              ))}
            </View>
          ) : null}

          {article.sections.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
              {article.sections.map((s, i) => <Chip key={i} label={s.title || t("news.intro")} active={i === tab} game={game} onPress={() => setTab(i)} />)}
            </ScrollView>
          ) : null}

          {current ? (
            <View onLayout={e => { sectionTop.current = e.nativeEvent.layout.y; }}>
              {current.image ? <Image source={{ uri: current.image }} style={styles.sectionImg} resizeMode="cover" /> : null}
              {current.entries.map(e => <Entry key={e.name} entry={e} accent={accent} onLayout={onEntryLayout(e.name)} />)}
              {current.groups.length ? <View style={styles.card}><Groups groups={current.groups} accent={accent} /></View> : null}
              {current.notes.map((n, i) => <Text key={i} style={styles.note}>{n}</Text>)}
            </View>
          ) : null}

          <PressableScale onPress={() => Linking.openURL(article.url)} haptic scaleTo={0.97} style={styles.official} accessibilityRole="link">
            <Text style={styles.officialText}>{t("news.viewOfficial")} ↗</Text>
          </PressableScale>
          <Text style={styles.source}>{t("news.readerNote")}</Text>
        </View>
      </ScrollView>
      <View style={styles.topbar} pointerEvents="box-none">{back}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.bg },
  center:     { justifyContent: "center" },
  content:    { paddingBottom: spacing.hero },
  pad:        { paddingHorizontal: spacing.lg },
  gap:        { marginTop: spacing.md },
  flex:       { flex: 1 },
  flip:       { transform: [{ rotate: "180deg" }] },
  topbar:     { position: "absolute", top: spacing.xxxl, left: spacing.lg },
  round:      { width: sizes.avatarMd, height: sizes.avatarMd, borderRadius: sizes.avatarMd / 2, alignItems: "center", justifyContent: "center", backgroundColor: withAlpha(colors.bg, 0.6), borderWidth: sizes.hairline, borderColor: withAlpha(colors.text, 0.2) },
  head:       { height: sizes.chart * 2.4, justifyContent: "flex-end", overflow: "hidden" },
  headBody:   { padding: spacing.lg, gap: spacing.xs },
  title:      { ...type.title, color: colors.text, marginTop: spacing.xs },
  date:       { ...type.micro, color: colors.textSecondary },
  summary:    { ...type.body, color: colors.textSecondary, marginTop: spacing.xs },
  brief:      { flexDirection: "row", gap: spacing.xs, marginTop: spacing.md },
  briefBox:   { flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: sizes.hairline, borderColor: colors.border },
  briefNum:   { ...type.heading, fontVariant: ["tabular-nums"] },
  briefLabel: { ...type.micro, color: colors.textSecondary },
  tabs:       { paddingTop: spacing.md, paddingBottom: spacing.xs },
  sectionImg: { width: "100%", aspectRatio: 16 / 9, borderRadius: radii.lg, marginTop: spacing.sm },
  entry:      { marginTop: spacing.md, borderRadius: radii.xl, overflow: "hidden", backgroundColor: colors.surface, borderWidth: sizes.hairline, borderColor: colors.border },
  band:       { height: sizes.chart * 0.68, flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, padding: spacing.md },
  bandShade:  { backgroundColor: withAlpha(colors.bg, 0.45) },
  entryIcon:  { width: sizes.avatarLg, height: sizes.avatarLg, borderRadius: radii.md, borderWidth: sizes.hairline, borderColor: withAlpha(colors.text, 0.25) },
  entryName:  { ...type.heading, color: colors.text },
  entrySub:   { ...type.micro, color: colors.textSecondary },
  why:        { ...type.caption, fontStyle: "italic", color: colors.textSecondary, marginTop: spacing.md, marginHorizontal: spacing.md, paddingLeft: spacing.sm, borderLeftWidth: sizes.borderThick },
  entryBody:  { padding: spacing.md, paddingTop: spacing.xs },
  card:       { marginTop: spacing.md, padding: spacing.md, paddingTop: spacing.xs, borderRadius: radii.xl, backgroundColor: colors.surface, borderWidth: sizes.hairline, borderColor: colors.border },
  group:      { marginTop: spacing.sm },
  groupHead:  { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xxs },
  groupIcon:  { width: sizes.item, height: sizes.item, borderRadius: radii.sm },
  groupDot:   { width: sizes.dot, height: sizes.dot, borderRadius: sizes.dot / 2 },
  groupTitle: { ...type.captionStrong, flexShrink: 1 },
  line:       { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginTop: spacing.xs },
  arrow:      { width: spacing.lg, height: spacing.lg, borderRadius: radii.xs, alignItems: "center", justifyContent: "center", marginTop: spacing.xxs },
  arrowText:  { ...type.micro },
  lineText:   { ...type.caption, color: colors.textSecondary, flex: 1 },
  lineLabel:  { ...type.captionStrong, color: colors.text },
  before:     { ...type.caption, color: colors.textMuted, textDecorationLine: "line-through" },
  after:      { ...type.captionStrong, color: colors.text },
  text:       { ...type.caption, color: colors.textSecondary, marginTop: spacing.xs },
  note:       { ...type.body, color: colors.textSecondary, marginTop: spacing.md },
  official:   { alignItems: "center", justifyContent: "center", height: sizes.avatarLg + spacing.sm, borderRadius: radii.lg, marginTop: spacing.lg, backgroundColor: colors.surface, borderWidth: sizes.hairline, borderColor: colors.border },
  officialText:{ ...type.captionStrong, color: colors.textSecondary },
  source:     { ...type.micro, color: colors.textMuted, marginTop: spacing.md },
});
