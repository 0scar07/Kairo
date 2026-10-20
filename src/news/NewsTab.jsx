import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Image, Linking, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Card, ErrorState, PressableScale, showHud } from "../components/ui";
import { TeamCrest } from "../games/wildrift/components";
import { getGameMeta } from "../games/registry";
import { ChangedPoster, ChipLogo, ContinueCard, GamePill, HeroCarousel, NewsCard, Rail, SavedMark, Shade, TopFive } from "./components";
import { AmbientGlow, BalanceBar, BrandLoader, GoldSkeleton, KenBurnsImage, PillChips } from "./fx";
import PeekOverlay from "./PeekOverlay";
import { featured, fmtNewsDate, getArticle, getNews, imageOf, patchVersion } from "./api";
import { topChanges } from "./essentials";
import { loadMyList, loadReading, toggleMyList } from "./storage";
import { useI18n } from "../i18n/I18nProvider";
import { errorMessage } from "../utils/format";
import { success } from "../utils/haptics";
import { accents, colors, radii, sizes, spacing, type, withAlpha } from "../theme";

// Orden de los chips de juego (solo aparecen los que tienen noticias)
const GAME_ORDER = ["lol", "valorant", "wildrift", "tft", "dota2", "fortnite", "apex", "pubg"];
// Juegos cuyos parches traen campeones cambiados (para el Top 5 y los pósteres)
const WITH_CHAMPIONS = ["lol", "wildrift"];

/**
 * Pestaña Noticias de Explorar (al estilo Netflix / Apple): carrusel destacado con luz ambiental del color de cada
 * noticia, chips con pastilla deslizante, Top 5 del parche, Seguir leyendo, Mi lista y filas por tipo. Al elegir un
 * juego, su arte flota de fondo con el equilibrio del parche y los campeones que cambiaron. Mantener presionada una
 * noticia abre su vista previa.
 *  - visible, onArticle({ game, path, section?, item }), onMatch(id), onClip({ startId })
 */
export default function NewsTab({ visible, onArticle, onMatch, onClip }) {
  const { t, language } = useI18n();
  const [state, setState] = useState({ status: "loading" });
  const [game, setGame] = useState("all");
  const [patch, setPatch] = useState(null);       // último parche del juego elegido (o de LoL en "Todo", para el Top 5)
  const [ambient, setAmbient] = useState(null);
  const [myList, setMyList] = useState([]);
  const [reading, setReading] = useState([]);
  const [peek, setPeek] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!visible) return undefined;
    let alive = true;
    setState(s => (s.status === "ready" ? { ...s, refreshing: true } : { status: "loading" }));
    getNews(language)
      .then(d => { if (alive) setState({ status: "ready", items: d.items || [] }); })
      .catch(e => { if (alive) setState(s => (s.status === "ready" ? { ...s, refreshing: false } : { status: "error", message: errorMessage(e) })); });
    return () => { alive = false; };
  }, [visible, language, attempt]);

  // Mi lista y Seguir leyendo viven en el teléfono: se releen cada vez que se abre la hoja
  const reloadLocal = useCallback(() => { loadMyList().then(setMyList); loadReading().then(setReading); }, []);
  useEffect(() => { if (visible) reloadLocal(); }, [visible]);

  const items = state.items || [];
  const patchGame = game === "all" ? "lol" : game;
  const latestPatch = useMemo(() => items.find(i => i.game === patchGame && i.kind === "patch" && i.article), [items, patchGame]);

  useEffect(() => {
    setPatch(null);
    if (!latestPatch || !WITH_CHAMPIONS.includes(latestPatch.game)) return undefined;
    let alive = true;
    getArticle(latestPatch.article.game, latestPatch.article.path).then(a => { if (alive) setPatch(a); }).catch(() => {});
    return () => { alive = false; };
  }, [latestPatch?.id]);

  const saved = id => myList.some(i => i.id === id);
  const kindLabel = item => (item.kind === "patch" ? t("news.kindPatch") : item.kind === "champion" ? t("news.kindChampion") : item.kind === "event" ? t("news.kindEvent") : item.kind === "esports" ? t("news.kindEsports") : t("news.kindNews"));
  const metaLine = (item, asTitle) => {
    if (item.kind === "champion") {
      const c = item.champion;
      if (asTitle) return t("news.championTitle", { team: c.team.name });
      return t("news.championSub", { event: c.event || "", score: `${c.team.score ?? "-"}–${c.opponent.score ?? "-"}`, rival: c.opponent.name });
    }
    return [getGameMeta(item.game)?.name, fmtNewsDate(item.date), item.summary].filter(Boolean).join(" · ");
  };
  const cta = item => (item.article ? `▶  ${t("news.read")}` : item.kind === "champion" ? t("news.viewMatch") : `${t("news.open")} ↗`);

  function open(item, section) {
    if (item.kind === "clip" && onClip) onClip({ startId: item.clipId });
    else if (item.article) onArticle({ ...item.article, section, item });
    else if (item.kind === "champion") onMatch(item.champion.matchId);
    else if (item.url) Linking.openURL(item.url);
  }
  async function toggleSave(item) {
    const { list, saved: now } = await toggleMyList(item);
    setMyList(list);
    success();
    showHud(now ? t("news.savedToast") : t("news.removedToast"), now ? "check" : "close");
  }
  const peekProps = item => ({ onLongPress: () => setPeek(item), saved: saved(item.id) });

  if (state.status === "loading") {
    return (
      <View>
        <BrandLoader label={t("news.loading")} />
        <GoldSkeleton height={sizes.chart * 2.5} radius={radii.xl} />
        <View style={styles.skelRow}>{[0, 1, 2].map(i => <GoldSkeleton key={i} width={sizes.chart * 1.25} height={sizes.chart * 0.8} />)}</View>
      </View>
    );
  }
  if (state.status === "error") return <ErrorState message={state.message} onRetry={() => setAttempt(n => n + 1)} />;

  const games = GAME_ORDER.filter(g => items.some(i => i.game === g));
  const chips = (
    <PillChips
      style={styles.chips}
      value={game}
      onChange={setGame}
      items={[{ key: "all", label: t("news.all"), accent: accents.lol }, ...games.map(g => ({ key: g, label: getGameMeta(g)?.short || g, icon: <ChipLogo game={g} />, accent: getGameMeta(g)?.accent }))]}
    />
  );
  const peekOverlay = (
    <PeekOverlay
      item={peek}
      saved={peek ? saved(peek.id) : false}
      onClose={() => setPeek(null)}
      onRead={() => { const p = peek; setPeek(null); open(p); }}
      onToggleSave={() => { toggleSave(peek); setPeek(null); }}
      onOpenWeb={() => { const p = peek; setPeek(null); Linking.openURL(p.url); }}
    />
  );
  const champs = (patch?.sections || []).flatMap(s => s.entries).filter(e => e.kind === "champion");
  const openPatch = section => latestPatch && open(latestPatch, section);

  // ----- Un juego elegido -----
  if (game !== "all") {
    const mine = items.filter(i => i.game === game);
    const meta = getGameMeta(game);
    const rank = e => (e.dir > 0 ? 0 : e.dir < 0 ? 1 : 2);
    const sorted = champs.slice().sort((x, y) => rank(x) - rank(y));
    const art = sorted.find(e => e.banner && e.dir > 0)?.banner || sorted.find(e => e.banner)?.banner || imageOf(latestPatch) || imageOf(mine[0]);
    const tint = latestPatch?.color || meta?.accent;
    return (
      <View>
        <AmbientGlow color={tint} />
        <View style={styles.gameHero}>
          {/* El arte entra con un fundido al cambiar de juego y flota despacio */}
          <Animated.View key={art || game} entering={FadeIn.duration(500)} exiting={FadeOut.duration(300)} style={StyleSheet.absoluteFill}>
            <KenBurnsImage uri={art} active />
          </Animated.View>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(tint || colors.bg, 0.12) }]} />
          <Shade from={0.05} mid={0.5} to={1} />
          <View style={styles.gameHeroBody}>
            {chips}
            <Text style={styles.gameName}>{meta?.name}</Text>
            {latestPatch ? (
              <Text style={styles.gameSub} numberOfLines={2}>
                {[latestPatch.title, patch?.counts?.champions ? t("news.changedCount", { n: patch.counts.champions }) : null, fmtNewsDate(latestPatch.date)].filter(Boolean).join(" · ")}
              </Text>
            ) : null}
          </View>
        </View>

        {patch?.counts?.champions ? (
          <BalanceBar up={patch.counts.up} down={patch.counts.down} title={t("news.balance")} upLabel={t("news.upCount", { n: patch.counts.up })} downLabel={t("news.downCount", { n: patch.counts.down })} />
        ) : null}

        {sorted.length ? (
          <Rail title={t("news.whatChanged")} action={t("news.readPatch")} onAction={() => openPatch()}>
            {sorted.slice(0, 16).map((e, i) => <ChangedPoster key={e.name} entry={e} index={i} highlight={i === 0 && e.dir > 0} onPress={() => openPatch(e.name)} />)}
          </Rail>
        ) : latestPatch ? (
          <Rail title={t("news.patchNotes")}>
            <NewsCard item={latestPatch} wide sub={fmtNewsDate(latestPatch.date)} onPress={() => open(latestPatch)} {...peekProps(latestPatch)} />
          </Rail>
        ) : null}

        <Text style={styles.section}>{t("news.moreOf", { game: meta?.name })}</Text>
        <Card padded={false}>
          {mine.filter(i => i.id !== latestPatch?.id).map((i, n) => (
            <PressableScale key={i.id} onPress={() => open(i)} onLongPress={() => setPeek(i)} scaleTo={0.98} style={[styles.listRow, n > 0 && styles.sep]} accessibilityRole="button">
              {imageOf(i) ? <Image source={{ uri: imageOf(i) }} style={styles.thumb} /> : <View style={[styles.thumb, { backgroundColor: withAlpha(meta?.accent || colors.text, 0.2) }]} />}
              <View style={styles.flex}>
                <Text style={styles.listTitle} numberOfLines={2}>{i.title}</Text>
                <Text style={styles.listSub} numberOfLines={1}>{[kindLabel(i), fmtNewsDate(i.date)].filter(Boolean).join(" · ")}{i.article ? "" : " ↗"}</Text>
              </View>
              {saved(i.id) ? <SavedMark /> : null}
            </PressableScale>
          ))}
        </Card>
        <Text style={styles.source}>{t("news.source")}</Text>
        {peekOverlay}
      </View>
    );
  }

  // ----- Todo -----
  const top = featured(items);
  const top5 = topChanges(patch, 5);
  const patches = items.filter(i => i.kind === "patch" && !top.some(f => f.id === i.id)).slice(0, 10);
  const esports = items.filter(i => i.kind === "champion" || i.kind === "esports").slice(0, 6);
  const events = items.filter(i => (i.kind === "event" || i.kind === "news") && !top.some(f => f.id === i.id)).slice(0, 10);
  return (
    <View>
      <AmbientGlow color={ambient} />
      <HeroCarousel items={top} onOpen={item => open(item)} onLongPress={setPeek} onColor={setAmbient} kindLabel={kindLabel} metaLine={metaLine} cta={cta} />
      {chips}

      {top5.length ? (
        <Rail title={t("news.top5", { patch: patchVersion(latestPatch?.title) })} action={t("news.seeAll")} onAction={() => openPatch()}>
          <TopFive entries={top5} onPress={e => openPatch(e.name)} />
        </Rail>
      ) : null}

      {reading.length ? (
        <Rail title={t("news.continueReading")}>
          {reading.map(i => <ContinueCard key={i.id} item={i} onPress={() => open(i, i.section)} />)}
        </Rail>
      ) : null}

      {myList.length ? (
        <Rail title={t("news.myList")}>
          {myList.map(i => <NewsCard key={i.id} item={i} saved sub={fmtNewsDate(i.date)} onPress={() => open(i)} onLongPress={() => setPeek(i)} />)}
        </Rail>
      ) : null}

      {patches.length ? (
        <Rail title={t("news.patchNotes")}>
          {patches.map(i => <NewsCard key={i.id} item={i} sub={fmtNewsDate(i.date)} onPress={() => open(i)} {...peekProps(i)} />)}
        </Rail>
      ) : null}

      {esports.length ? (
        <>
          <Text style={styles.section}>{t("news.esports")}</Text>
          {esports.map(i => i.kind === "champion" ? (
            <PressableScale key={i.id} onPress={() => open(i)} onLongPress={() => setPeek(i)} scaleTo={0.98} style={styles.champion} accessibilityRole="button">
              <TeamCrest team={i.champion.team} size={sizes.avatarLg + spacing.xs} />
              <View style={styles.flex}>
                <GamePill game={i.game} label={i.champion.event} />
                <Text style={styles.championTitle} numberOfLines={1}>{t("news.championTitle", { team: i.champion.team.name })}</Text>
                <Text style={styles.listSub} numberOfLines={1}>{metaLine(i)}</Text>
              </View>
            </PressableScale>
          ) : (
            <PressableScale key={i.id} onPress={() => open(i)} onLongPress={() => setPeek(i)} scaleTo={0.98} style={[styles.listRow, styles.esportsRow]} accessibilityRole="button">
              {imageOf(i) ? <Image source={{ uri: imageOf(i) }} style={styles.thumb} /> : null}
              <View style={styles.flex}>
                <Text style={styles.listTitle} numberOfLines={2}>{i.title}</Text>
                <Text style={styles.listSub}>{[getGameMeta(i.game)?.name, fmtNewsDate(i.date)].filter(Boolean).join(" · ")}</Text>
              </View>
            </PressableScale>
          ))}
        </>
      ) : null}

      {events.length ? (
        <Rail title={t("news.events")}>
          {events.map(i => <NewsCard key={i.id} item={i} wide sub={i.summary || fmtNewsDate(i.date)} onPress={() => open(i)} {...peekProps(i)} />)}
        </Rail>
      ) : null}

      {state.refreshing ? <BrandLoader label={t("news.loading")} /> : (
        <PressableScale onPress={() => setAttempt(n => n + 1)} haptic scaleTo={0.97} style={styles.refresh} accessibilityRole="button">
          <Text style={styles.refreshText}>↻  {t("news.refresh")}</Text>
        </PressableScale>
      )}
      <Text style={styles.source}>{t("news.source")}</Text>
      {peekOverlay}
    </View>
  );
}

const styles = StyleSheet.create({
  flex:         { flex: 1 },
  skelRow:      { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  chips:        { marginTop: spacing.md },
  section:      { ...type.section, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  gameHero:     { minHeight: sizes.chart * 2.1, borderRadius: radii.xl, overflow: "hidden", justifyContent: "flex-end", backgroundColor: colors.surfaceRaised },
  gameHeroBody: { padding: spacing.md, paddingTop: sizes.chart * 0.95 },
  gameName:     { ...type.largeTitle, color: colors.text, marginTop: spacing.sm },
  gameSub:      { ...type.caption, color: colors.textSecondary, marginTop: spacing.xxs },
  listRow:      { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.sm },
  esportsRow:   { borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: sizes.hairline, borderColor: colors.border, marginBottom: spacing.sm },
  sep:          { borderTopWidth: sizes.hairline, borderTopColor: colors.border },
  thumb:        { width: sizes.avatarHero, height: sizes.avatarHero * 0.6, borderRadius: radii.md },
  listTitle:    { ...type.smallStrong, color: colors.text },
  listSub:      { ...type.micro, color: colors.textMuted, marginTop: spacing.xxs },
  champion:     { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radii.lg, borderWidth: sizes.hairline, borderColor: withAlpha(colors.gold, 0.4), backgroundColor: withAlpha(colors.gold, 0.08), marginBottom: spacing.sm },
  championTitle:{ ...type.heading, color: colors.text, marginTop: spacing.xs },
  refresh:      { alignSelf: "center", marginTop: spacing.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.pill, borderWidth: sizes.hairline, borderColor: colors.border, backgroundColor: colors.surface },
  refreshText:  { ...type.captionStrong, color: colors.textSecondary },
  source:       { ...type.micro, color: colors.textMuted, marginTop: spacing.lg },
});
