import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Image, Linking, Pressable, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  Extrapolation, FadeInDown, interpolate, runOnJS, useAnimatedReaction, useAnimatedRef, useAnimatedScrollHandler,
  useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import Svg, { Path } from "react-native-svg";
import { CountUp, ErrorState, PressableScale, showHud } from "../components/ui";
import Icon from "../components/Icon";
import { getGameMeta } from "../games/registry";
import { DirBadge, GamePill, Shade } from "./components";
import { Flash, GoldSkeleton, Reveal, Strike } from "./fx";
import StoryShareButton from "./StoryShare";
import { fmtLongDate, getArticle, patchVersion } from "./api";
import { essentials, topChanges } from "./essentials";
import { FONT_SCALES, loadFontScale, loadMyList, saveFontScale, saveReading, toggleMyList } from "./storage";
import { useT } from "../i18n/I18nProvider";
import { errorMessage } from "../utils/format";
import { select, success } from "../utils/haptics";
import { colors, fontSizes, radii, sizes, spacing, type, withAlpha } from "../theme";

const HEAD = sizes.chart * 2.4;
const scaled = (s, scale) => ({ fontSize: s.fontSize * scale, lineHeight: (s.lineHeight || s.fontSize * 1.4) * scale });

/** Una línea de cambio: "Daño: 70 → 115" con ▲/▼; el valor viejo se tacha y el nuevo destella */
function Line({ line, scale }) {
  if (!line.label && line.before == null) return <Text style={[styles.text, scaled(type.caption, scale)]}>• {line.text}</Text>;
  const tone = line.dir > 0 ? colors.win : line.dir < 0 ? colors.loss : colors.textMuted;
  return (
    <View style={styles.line}>
      <View style={[styles.arrow, { backgroundColor: withAlpha(tone, 0.2) }]}><Text style={[styles.arrowText, { color: tone }]}>{line.dir > 0 ? "▲" : line.dir < 0 ? "▼" : "•"}</Text></View>
      <View style={styles.lineBody}>
        {line.label ? <Text style={[styles.lineLabel, scaled(type.captionStrong, scale)]}>{line.label}</Text> : null}
        <View style={styles.values}>
          <Strike style={[styles.before, scaled(type.caption, scale)]}>{line.before}</Strike>
          <Text style={[styles.to, scaled(type.caption, scale)]}>→</Text>
          <Flash style={[styles.after, scaled(type.captionStrong, scale)]} tone={line.dir ? tone : null}>{line.after}</Flash>
        </View>
      </View>
    </View>
  );
}

function Groups({ groups, accent, scale }) {
  return groups.map((g, i) => (
    <View key={i} style={styles.group}>
      {g.title ? (
        <View style={styles.groupHead}>
          {g.icon ? <Image source={{ uri: g.icon }} style={styles.groupIcon} /> : <View style={[styles.groupDot, { backgroundColor: accent }]} />}
          <Text style={[styles.groupTitle, { color: accent }, scaled(type.captionStrong, scale)]}>{g.title}</Text>
        </View>
      ) : null}
      {g.lines.map((l, j) => <Line key={j} line={l} scale={scale} />)}
    </View>
  ));
}

/** Tarjeta de un campeón u objeto: su arte, el porqué de Riot y sus cambios */
function Entry({ entry, accent, scale }) {
  const t = useT();
  const changes = entry.groups.reduce((n, g) => n + g.lines.length, 0);
  return (
    <View style={styles.entry}>
      <View style={styles.band}>
        {entry.banner ? <Image source={{ uri: entry.banner }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
        <View style={[StyleSheet.absoluteFill, styles.bandShade]} />
        {entry.image ? <Image source={{ uri: entry.image }} style={styles.entryIcon} /> : null}
        <View style={styles.flex}>
          <Text style={styles.entryName} numberOfLines={1}>{entry.name}</Text>
          <Text style={styles.entrySub}>{entry.role || (changes === 1 ? t("news.oneChange") : t("news.changes", { n: changes }))}</Text>
        </View>
        <DirBadge dir={entry.dir} glow />
      </View>
      {entry.context ? <Text style={[styles.why, { borderLeftColor: accent }, scaled(type.caption, scale)]}>{entry.context}</Text> : null}
      <View style={styles.entryBody}><Groups groups={entry.groups} accent={accent} scale={scale} /></View>
    </View>
  );
}

/** Marcador de Mi lista que se llena con un rebote */
function Bookmark({ saved, onPress, label }) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable
      onPress={() => { s.value = withSequence(withSpring(1.35, { damping: 6, stiffness: 400 }), withSpring(1, { damping: 10 })); onPress(); }}
      hitSlop={spacing.sm} style={styles.round} accessibilityRole="button" accessibilityState={{ selected: saved }} accessibilityLabel={label}
    >
      <Animated.View style={anim}>
        <Svg width={fontSizes.lg} height={fontSizes.lg} viewBox="0 0 24 24"><Path d="M6 3h12v18l-6-4-6 4z" stroke="#F3D58A" strokeWidth={2} strokeLinejoin="round" fill={saved ? "#F3D58A" : "none"} /></Svg>
      </Animated.View>
    </Pressable>
  );
}

/**
 * Lector de un artículo de Riot dentro de la app (sobre todo notas del parche), con acabado de app nativa: la cabecera
 * hace parallax y se convierte en una barra de vidrio con el título, una barra de color marca cuánto se leyó, las
 * pestañas de sección quedan fijas y siguen la lectura, los contadores suben, "Lo esencial en 10 segundos" resume lo más
 * importante, cada campeón aparece al llegar a él, se puede cambiar el tamaño de letra, guardar en Mi lista y compartir
 * el Top 5 como historia. Al salir recuerda dónde quedó la lectura ("Seguir leyendo").
 *  - params: { game, path, section?, item? }   (section: nombre de un campeón o título de una sección)
 */
export default function ArticleScreen({ route, navigation }) {
  const t = useT();
  const reduce = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { game, path, section: jumpTo } = route.params;
  const accent = getGameMeta(game)?.accent || colors.text;
  const [state, setState] = useState({ status: "loading" });
  const [active, setActive] = useState(0);
  const [scale, setScale] = useState(1);
  const [saved, setSaved] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [stuck, setStuck] = useState(false);     // la barra de vidrio está visible (y con ella sus pestañas)

  const scroller = useAnimatedRef();
  const chipScroller = useRef(null);
  const scrollY = useSharedValue(0);
  const viewport = useSharedValue(height);
  const contentH = useSharedValue(1);
  const bodyTop = useSharedValue(0);
  const sectionTops = useSharedValue([]);
  const tops = useRef([]);
  const entryTops = useRef({});
  const progress = useRef(0);
  const jumped = useRef(false);

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    getArticle(game, path)
      .then(article => { if (alive) setState({ status: "ready", article }); })
      .catch(e => { if (alive) setState({ status: "error", message: errorMessage(e) }); });
    return () => { alive = false; };
  }, [game, path, attempt]);
  useEffect(() => { loadFontScale().then(setScale); }, []);

  const article = state.article;
  const item = useMemo(() => route.params.item || (article ? { id: `${game}:${path}`, game, kind: "patch", title: article.title, date: article.date, image: article.image, url: article.url, article: { game, path } } : null), [article]);
  useEffect(() => { if (item) loadMyList().then(l => setSaved(l.some(i => i.id === item.id))); }, [item?.id]);

  // Al salir se anota cuánto se leyó y en qué sección (para "Seguir leyendo")
  const activeTitle = useRef(null);
  useEffect(() => { activeTitle.current = article?.sections?.[active]?.title || null; }, [active, article]);
  const itemRef = useRef(null);
  useEffect(() => { itemRef.current = item; }, [item]);
  useEffect(() => () => { if (itemRef.current) saveReading(itemRef.current, progress.current, activeTitle.current); }, []);

  const onScroll = useAnimatedScrollHandler(e => {
    scrollY.value = e.contentOffset.y;
    viewport.value = e.layoutMeasurement.height;
    contentH.value = e.contentSize.height;
  });
  function setProgress(p) { progress.current = Math.min(1, Math.max(0, p)); }
  // Sección activa y avance de lectura (se pasan a JS solo cuando cambian)
  useAnimatedReaction(
    () => {
      const y = scrollY.value + sizes.chart * 1.6;
      let idx = 0;
      for (let i = 0; i < sectionTops.value.length; i++) if (bodyTop.value + sectionTops.value[i] <= y) idx = i;
      return idx;
    },
    (idx, prev) => { if (idx !== prev) runOnJS(setActive)(idx); },
  );
  useAnimatedReaction(
    () => scrollY.value > HEAD - sizes.chart * 0.8,
    (on, prev) => { if (on !== prev) runOnJS(setStuck)(on); },
  );
  useAnimatedReaction(
    () => Math.round((scrollY.value / Math.max(1, contentH.value - viewport.value)) * 20) / 20,
    (p, prev) => { if (p !== prev) runOnJS(setProgress)(p); },
  );

  useEffect(() => { chipScroller.current?.scrollTo({ x: Math.max(0, active * sizes.chart * 0.7 - sizes.chart), animated: !reduce }); }, [active]);

  const headStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [-HEAD, 0, HEAD], [-HEAD / 2, 0, HEAD * 0.45]) },
      { scale: interpolate(scrollY.value, [-HEAD, 0], [1.6, 1], Extrapolation.CLAMP) },
    ],
  }));
  const compactStyle = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [HEAD - sizes.chart * 1.2, HEAD - sizes.chart * 0.6], [0, 1], Extrapolation.CLAMP) }));
  const barStyle = useAnimatedStyle(() => ({ width: `${Math.min(100, Math.max(0, (scrollY.value / Math.max(1, contentH.value - viewport.value)) * 100))}%` }));

  function goToSection(i) {
    select();
    setActive(i);
    scroller.current?.scrollTo({ y: bodyTop.value + (tops.current[i] || 0) - sizes.chart * 1.2, animated: !reduce });
  }
  // Al llegar desde un póster o desde "Seguir leyendo" se baja hasta el campeón o la sección
  function tryJump() {
    if (jumped.current || !jumpTo || !article) return;
    const si = article.sections.findIndex(s => s.title === jumpTo || s.entries.some(e => e.name === jumpTo));
    if (si < 0 || tops.current[si] == null) return;
    const isEntry = article.sections[si].entries.some(e => e.name === jumpTo);
    if (isEntry && entryTops.current[jumpTo] == null) return;
    jumped.current = true;
    const y = bodyTop.value + tops.current[si] + (isEntry ? entryTops.current[jumpTo] : 0) - sizes.chart * 1.2;
    setTimeout(() => scroller.current?.scrollTo({ y, animated: !reduce }), 150);
  }

  async function toggleSave() {
    if (!item) return;
    const { saved: now } = await toggleMyList(item);
    setSaved(now);
    success();
    showHud(now ? t("news.savedToast") : t("news.removedToast"), now ? "check" : "close");
  }

  const back = (
    <PressableScale onPress={() => navigation.goBack()} hitSlop={spacing.sm} style={styles.round} accessibilityRole="button" accessibilityLabel={t("news.back")}>
      <Icon name="chevron" size={fontSizes.lg} color={colors.text} style={styles.flip} />
    </PressableScale>
  );

  if (state.status === "loading") {
    return (
      <View style={styles.container}>
        <GoldSkeleton height={HEAD} radius={0} />
        <View style={styles.pad}>{[0, 1, 2].map(i => <GoldSkeleton key={i} height={sizes.chart} style={styles.gap} />)}</View>
        <View style={[styles.topbar, { top: insets.top + spacing.sm }]}>{back}</View>
      </View>
    );
  }
  if (state.status === "error") {
    return <View style={[styles.container, styles.center]}><ErrorState message={state.message} onRetry={() => setAttempt(n => n + 1)} /><View style={[styles.topbar, { top: insets.top + spacing.sm }]}>{back}</View></View>;
  }

  const tabsRow = ref => (article.sections.length > 1 ? (
    <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
      {article.sections.map((s, i) => {
        const on = i === active;
        return (
          <Pressable key={i} onPress={() => goToSection(i)} style={[styles.tab, on && { backgroundColor: withAlpha(accent, 0.92), borderColor: accent, boxShadow: `0 0 14px ${withAlpha(accent, 0.45)}` }]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <Text style={[styles.tabText, on && styles.tabTextOn]} numberOfLines={1}>{s.title || t("news.intro")}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  ) : null);
  const c = article.counts;
  const key = essentials(article, 3);
  const top5 = topChanges(article, 5);
  return (
    <View style={styles.container}>
      <Animated.ScrollView
        ref={scroller}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
        onLayout={e => { viewport.value = e.nativeEvent.layout.height; }}
      >
        {/* 0 · cabecera con parallax */}
        <View style={styles.head}>
          <Animated.View style={[StyleSheet.absoluteFill, headStyle]}>
            {article.image ? <Image source={{ uri: article.image }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
          </Animated.View>
          <Shade from={0.35} mid={0.3} to={1} />
          <Animated.View entering={reduce ? undefined : FadeInDown.duration(420)} style={styles.headBody}>
            <GamePill game={game} label={t("news.kindPatch")} solid />
            <Text style={styles.title}>{article.title}</Text>
            <Text style={styles.date}>{[fmtLongDate(article.date), t("news.officialSite")].filter(Boolean).join(" · ")}</Text>
          </Animated.View>
        </View>

        {/* 1 · resumen, contadores, lo esencial y tamaño de letra */}
        <View style={styles.pad}>
          {article.summary ? <Text style={[styles.summary, scaled(type.body, scale)]}>{article.summary}</Text> : null}
          {c.champions ? (
            <View style={styles.brief}>
              {[[c.champions, t("news.champions"), colors.text], [c.up, t("news.ups"), colors.win], [c.down, t("news.downs"), colors.loss], ...(c.items ? [[c.items, t("news.items"), colors.text]] : [])].map(([n, label, tone]) => (
                <View key={label} style={styles.briefBox}><CountUp value={n} style={[styles.briefNum, { color: tone }]} /><Text style={styles.briefLabel}>{label}</Text></View>
              ))}
            </View>
          ) : null}
          {key.length ? (
            <View style={styles.ess}>
              <View style={styles.essHead}><Text style={styles.essTitle}>⚡ {t("news.essentials")}</Text><Text style={styles.essSub}>{t("news.keyChanges", { n: key.length })}</Text></View>
              {key.map(({ entry, change }, i) => (
                <Animated.View key={entry.name} entering={reduce ? undefined : FadeInDown.delay(200 + i * 120).duration(380)} style={styles.essRow}>
                  {entry.image || entry.banner ? <Image source={{ uri: entry.image || entry.banner }} style={styles.essIcon} /> : null}
                  <Pressable style={styles.flex} onPress={() => { const si = article.sections.findIndex(s => s.entries.includes(entry)); if (si >= 0) goToSection(si); }} accessibilityRole="button">
                    <Text style={styles.essName} numberOfLines={1}>{entry.dir > 0 ? t("news.essUp", { name: entry.name }) : t("news.essDown", { name: entry.name })}</Text>
                    <Text style={styles.essLine} numberOfLines={1}>{[change.group, change.line.label].filter(Boolean).join(" · ")}: {change.line.before} → {change.line.after}</Text>
                  </Pressable>
                  <DirBadge dir={entry.dir} />
                </Animated.View>
              ))}
            </View>
          ) : null}
          <View style={styles.tools}>
            <View style={styles.aa} accessibilityLabel={t("news.textSize")}>
              {FONT_SCALES.map((s, i) => (
                <Pressable key={s} onPress={() => { select(); setScale(s); saveFontScale(s); }} style={[styles.aaBtn, scale === s && styles.aaOn]} accessibilityRole="button" accessibilityState={{ selected: scale === s }} accessibilityLabel={`${t("news.textSize")} ${i + 1}`}>
                  <Text style={[styles.aaText, { fontSize: fontSizes.sm + i * 3 }, scale === s && styles.aaTextOn]}>{i === 0 ? "A" : "Aa"}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* 2 · pestañas de sección (al bajar pasan a la barra de vidrio de arriba) */}
        <View style={styles.stickyWrap}>{tabsRow(null)}</View>

        {/* 3 · todas las secciones seguidas; cada campeón aparece al llegar a él */}
        <View style={styles.pad} onLayout={e => { bodyTop.value = e.nativeEvent.layout.y; tryJump(); }}>
          {article.sections.map((s, si) => (
            <View
              key={si}
              onLayout={e => {
                tops.current[si] = e.nativeEvent.layout.y;
                sectionTops.value = article.sections.map((_, k) => tops.current[k] ?? 1e6);
                tryJump();
              }}
            >
              {s.title ? <Text style={styles.sectionTitle}>{s.title}</Text> : null}
              {s.image ? <Image source={{ uri: s.image }} style={styles.sectionImg} resizeMode="cover" /> : null}
              {s.entries.map(e => (
                <View key={e.name} onLayout={ev => { entryTops.current[e.name] = ev.nativeEvent.layout.y; tryJump(); }}>
                  <Reveal scrollY={scrollY} viewport={viewport} offset={bodyTop}><Entry entry={e} accent={accent} scale={scale} /></Reveal>
                </View>
              ))}
              {s.groups.length ? <View style={styles.card}><Groups groups={s.groups} accent={accent} scale={scale} /></View> : null}
              {s.notes.map((n, i) => <Text key={i} style={[styles.note, scaled(type.body, scale)]}>{n}</Text>)}
            </View>
          ))}

          <StoryShareButton title={t("news.storyTitle", { patch: patchVersion(article.title) })} entries={top5} footer={t("news.storyFooter", { up: c.up, down: c.down })} accent={accent} />
          <PressableScale onPress={() => Linking.openURL(article.url)} haptic scaleTo={0.97} style={styles.official} accessibilityRole="link">
            <Text style={styles.officialText}>{t("news.viewOfficial")} ↗</Text>
          </PressableScale>
          <Text style={styles.source}>{t("news.readerNote")}</Text>
        </View>
      </Animated.ScrollView>

      {/* Barra de vidrio que aparece al bajar: título, sección actual, pestañas que siguen la lectura y avance */}
      <Animated.View pointerEvents={stuck ? "box-none" : "none"} style={[styles.compact, { paddingTop: insets.top + spacing.sm }, compactStyle]}>
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.compactTint]} pointerEvents="none" />
        <View style={styles.compactBody} pointerEvents="none">
          <Text style={styles.compactTitle} numberOfLines={1}>{article.title}</Text>
          <Text style={styles.compactSub} numberOfLines={1}>{[getGameMeta(game)?.name, article.sections[active]?.title].filter(Boolean).join(" · ")}</Text>
        </View>
        <View style={styles.compactTabs}>{tabsRow(chipScroller)}</View>
        <Animated.View style={[styles.readBar, { backgroundColor: accent, boxShadow: `0 0 10px ${withAlpha(accent, 0.7)}` }, barStyle]} />
      </Animated.View>
      <View style={[styles.topbar, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
        {back}
        <Bookmark saved={saved} onPress={toggleSave} label={saved ? t("news.removeList") : t("news.saveList")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg },
  center:      { justifyContent: "center" },
  content:     { paddingBottom: spacing.hero },
  pad:         { paddingHorizontal: spacing.lg },
  gap:         { marginTop: spacing.md },
  flex:        { flex: 1 },
  flip:        { transform: [{ rotate: "180deg" }] },
  topbar:      { position: "absolute", left: spacing.lg, right: spacing.lg, flexDirection: "row", justifyContent: "space-between" },
  round:       { width: sizes.avatarMd, height: sizes.avatarMd, borderRadius: sizes.avatarMd / 2, alignItems: "center", justifyContent: "center", backgroundColor: withAlpha(colors.bg, 0.6), borderWidth: sizes.hairline, borderColor: withAlpha(colors.text, 0.2) },
  head:        { height: HEAD, justifyContent: "flex-end", overflow: "hidden" },
  headBody:    { padding: spacing.lg, gap: spacing.xs },
  title:       { ...type.title, color: colors.text, marginTop: spacing.xs },
  date:        { ...type.micro, color: colors.textSecondary },
  summary:     { ...type.body, color: colors.textSecondary, marginTop: spacing.xs },
  brief:       { flexDirection: "row", gap: spacing.xs, marginTop: spacing.md },
  briefBox:    { flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: sizes.hairline, borderColor: colors.border },
  briefNum:    { ...type.heading, fontVariant: ["tabular-nums"] },
  briefLabel:  { ...type.micro, color: colors.textSecondary },
  ess:         { marginTop: spacing.md, padding: spacing.md, borderRadius: radii.xl, borderWidth: sizes.hairline, borderColor: withAlpha("#F3D58A", 0.35), backgroundColor: withAlpha("#F3D58A", 0.07) },
  essHead:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  essTitle:    { ...type.bodyStrong, color: colors.text },
  essSub:      { ...type.micro, color: "#F3D58A" },
  essRow:      { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  essIcon:     { width: sizes.avatarMd, height: sizes.avatarMd, borderRadius: radii.md },
  essName:     { ...type.smallStrong, color: colors.text },
  essLine:     { ...type.micro, color: colors.textSecondary, marginTop: spacing.xxs },
  tools:       { flexDirection: "row", marginTop: spacing.md, marginBottom: spacing.sm },
  aa:          { flexDirection: "row", gap: spacing.xxs, padding: spacing.xxs, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: sizes.hairline, borderColor: colors.border },
  aaBtn:       { minWidth: sizes.avatarMd, height: sizes.avatarSm - spacing.xxs, borderRadius: radii.sm, alignItems: "center", justifyContent: "center" },
  aaOn:        { backgroundColor: withAlpha(colors.text, 0.12) },
  aaText:      { ...type.smallStrong, color: colors.textSecondary },
  aaTextOn:    { color: colors.text },
  stickyWrap:  { backgroundColor: colors.bg, paddingHorizontal: spacing.lg, borderBottomWidth: sizes.hairline, borderBottomColor: withAlpha(colors.text, 0.06) },
  tabs:        { gap: spacing.xs, paddingVertical: spacing.sm, paddingRight: spacing.lg },
  tab:         { height: sizes.avatarSm - spacing.xxs, paddingHorizontal: spacing.md, borderRadius: radii.pill, alignItems: "center", justifyContent: "center", borderWidth: sizes.hairline, borderColor: colors.border, backgroundColor: withAlpha(colors.text, 0.04) },
  tabText:     { ...type.smallStrong, color: colors.textSecondary },
  tabTextOn:   { color: colors.onAccent },
  sectionTitle:{ ...type.section, color: colors.text, marginTop: spacing.xl },
  sectionImg:  { width: "100%", aspectRatio: 16 / 9, borderRadius: radii.lg, marginTop: spacing.sm },
  entry:       { marginTop: spacing.md, borderRadius: radii.xl, overflow: "hidden", backgroundColor: colors.surface, borderWidth: sizes.hairline, borderColor: colors.border },
  band:        { height: sizes.chart * 0.68, flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, padding: spacing.md },
  bandShade:   { backgroundColor: withAlpha(colors.bg, 0.45) },
  entryIcon:   { width: sizes.avatarLg, height: sizes.avatarLg, borderRadius: radii.md, borderWidth: sizes.hairline, borderColor: withAlpha(colors.text, 0.25) },
  entryName:   { ...type.heading, color: colors.text },
  entrySub:    { ...type.micro, color: colors.textSecondary },
  why:         { ...type.caption, fontStyle: "italic", color: colors.textSecondary, marginTop: spacing.md, marginHorizontal: spacing.md, paddingLeft: spacing.sm, borderLeftWidth: sizes.borderThick },
  entryBody:   { padding: spacing.md, paddingTop: spacing.xs },
  card:        { marginTop: spacing.md, padding: spacing.md, paddingTop: spacing.xs, borderRadius: radii.xl, backgroundColor: colors.surface, borderWidth: sizes.hairline, borderColor: colors.border },
  group:       { marginTop: spacing.sm },
  groupHead:   { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xxs },
  groupIcon:   { width: sizes.item, height: sizes.item, borderRadius: radii.sm },
  groupDot:    { width: sizes.dot, height: sizes.dot, borderRadius: sizes.dot / 2 },
  groupTitle:  { ...type.captionStrong, flexShrink: 1 },
  line:        { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginTop: spacing.xs },
  lineBody:    { flex: 1 },
  values:      { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: spacing.xs },
  arrow:       { width: spacing.lg, height: spacing.lg, borderRadius: radii.xs, alignItems: "center", justifyContent: "center", marginTop: spacing.xxs },
  arrowText:   { ...type.micro },
  lineLabel:   { ...type.captionStrong, color: colors.text },
  before:      { ...type.caption, color: colors.textMuted },
  to:          { ...type.caption, color: colors.textMuted },
  after:       { ...type.captionStrong, color: colors.text },
  text:        { ...type.caption, color: colors.textSecondary, marginTop: spacing.xs },
  note:        { ...type.body, color: colors.textSecondary, marginTop: spacing.md },
  official:    { alignItems: "center", justifyContent: "center", height: sizes.avatarLg + spacing.sm, borderRadius: radii.lg, marginTop: spacing.md, backgroundColor: colors.surface, borderWidth: sizes.hairline, borderColor: colors.border },
  officialText:{ ...type.captionStrong, color: colors.textSecondary },
  source:      { ...type.micro, color: colors.textMuted, marginTop: spacing.md },
  compact:     { position: "absolute", top: 0, left: 0, right: 0, borderBottomWidth: sizes.hairline, borderBottomColor: withAlpha(colors.text, 0.08), overflow: "hidden" },
  compactTabs: { paddingLeft: spacing.lg },
  compactTint: { backgroundColor: withAlpha(colors.bg, 0.55) },
  compactBody: { paddingHorizontal: sizes.avatarHero - spacing.md, alignItems: "center", minHeight: sizes.avatarMd },
  compactTitle:{ ...type.bodyStrong, color: colors.text },
  compactSub:  { ...type.micro, color: colors.textSecondary },
  readBar:     { position: "absolute", left: 0, bottom: 0, height: spacing.xxs },
});
