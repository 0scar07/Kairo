import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Image, Linking, ScrollView, StyleSheet } from "react-native";
import { Card, Chip, ErrorState, PressableScale, Skeleton } from "../components/ui";
import { TeamCrest } from "../games/wildrift/components";
import { getGameMeta } from "../games/registry";
import { ChangedPoster, ChipLogo, GamePill, HeroCarousel, NewsCard, Rail, Shade } from "./components";
import { featured, fmtNewsDate, getArticle, getNews, imageOf } from "./api";
import { useI18n } from "../i18n/I18nProvider";
import { errorMessage } from "../utils/format";
import { colors, radii, sizes, spacing, type, withAlpha } from "../theme";

// Orden de los chips de juego (solo aparecen los que tienen noticias)
const GAME_ORDER = ["lol", "valorant", "wildrift", "tft", "dota2", "fortnite", "apex", "pubg"];
// Juegos cuyos parches se leen dentro de la app y traen campeones cambiados
const WITH_CHAMPIONS = ["lol", "wildrift"];

/**
 * Pestaña Noticias de Explorar: un carrusel con lo más importante de todos los juegos y filas por tipo; al elegir un
 * juego, su arte de fondo, los campeones que cambiaron en su último parche y el resto de sus noticias.
 *  - visible, onArticle({ game, path, section? }), onMatch(id)
 */
export default function NewsTab({ visible, onArticle, onMatch }) {
  const { t, language } = useI18n();
  const [state, setState] = useState({ status: "loading" });
  const [game, setGame] = useState(null);
  const [patch, setPatch] = useState(null);       // artículo del último parche del juego elegido
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!visible) return undefined;
    let alive = true;
    setState(s => (s.status === "ready" ? s : { status: "loading" }));
    getNews(language)
      .then(d => { if (alive) setState({ status: "ready", items: d.items || [] }); })
      .catch(e => { if (alive) setState({ status: "error", message: errorMessage(e) }); });
    return () => { alive = false; };
  }, [visible, language, attempt]);

  const items = state.items || [];
  const latestPatch = useMemo(() => (game ? items.find(i => i.game === game && i.kind === "patch" && i.article) : null), [items, game]);

  // Al elegir un juego de Riot se lee su último parche para mostrar los campeones que cambiaron
  useEffect(() => {
    setPatch(null);
    if (!latestPatch || !WITH_CHAMPIONS.includes(latestPatch.game)) return undefined;
    let alive = true;
    getArticle(latestPatch.article.game, latestPatch.article.path).then(a => { if (alive) setPatch(a); }).catch(() => {});
    return () => { alive = false; };
  }, [latestPatch?.id]);

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

  function open(item) {
    if (item.article) onArticle(item.article);
    else if (item.kind === "champion") onMatch(item.champion.matchId);
    else if (item.url) Linking.openURL(item.url);
  }

  if (state.status === "loading") {
    return (
      <View>
        <Skeleton height={sizes.chart * 2.5} radius={radii.xl} />
        <View style={styles.skelRow}>{[0, 1, 2].map(i => <Skeleton key={i} width={sizes.chart * 1.25} height={sizes.chart * 0.8} radius={radii.lg} />)}</View>
      </View>
    );
  }
  if (state.status === "error") return <ErrorState message={state.message} onRetry={() => setAttempt(n => n + 1)} />;

  const games = GAME_ORDER.filter(g => items.some(i => i.game === g));
  const chips = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
      <Chip label={t("news.all")} active={!game} onPress={() => setGame(null)} />
      {games.map(g => <Chip key={g} label={getGameMeta(g)?.short || g} icon={<ChipLogo game={g} />} active={game === g} game={g} onPress={() => setGame(game === g ? null : g)} />)}
    </ScrollView>
  );

  // ----- Un juego elegido -----
  if (game) {
    const mine = items.filter(i => i.game === game);
    const meta = getGameMeta(game);
    // Primero los que suben, luego los que bajan y al final los que cambian sin un sentido claro
    const rank = e => (e.dir > 0 ? 0 : e.dir < 0 ? 1 : 2);
    const champs = (patch?.sections || []).flatMap(s => s.entries).filter(e => e.kind === "champion").sort((x, y) => rank(x) - rank(y));
    const art = champs.find(e => e.banner)?.banner || imageOf(latestPatch) || imageOf(mine[0]);
    const openPatch = section => latestPatch && onArticle({ ...latestPatch.article, section });
    return (
      <View>
        <View style={styles.gameHero}>
          {art ? <Image source={{ uri: art }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
          <Shade from={0.05} mid={0.5} to={1} />
          <View style={styles.gameHeroBody}>
            {chips}
            <Text style={[styles.gameName, { color: colors.text }]}>{meta?.name}</Text>
            {latestPatch ? (
              <Text style={styles.gameSub} numberOfLines={2}>
                {[latestPatch.title, patch?.counts?.champions ? t("news.changedCount", { n: patch.counts.champions }) : null, fmtNewsDate(latestPatch.date)].filter(Boolean).join(" · ")}
              </Text>
            ) : null}
          </View>
        </View>

        {champs.length ? (
          <Rail title={t("news.whatChanged")} action={t("news.readPatch")} onAction={() => openPatch()}>
            {champs.slice(0, 16).map(e => <ChangedPoster key={e.name} entry={e} onPress={() => openPatch(e.name)} />)}
          </Rail>
        ) : latestPatch ? (
          <Rail title={t("news.patchNotes")}>
            <NewsCard item={latestPatch} wide sub={fmtNewsDate(latestPatch.date)} onPress={() => open(latestPatch)} />
          </Rail>
        ) : null}

        <Text style={styles.section}>{t("news.moreOf", { game: meta?.name })}</Text>
        <Card padded={false}>
          {mine.filter(i => i.id !== latestPatch?.id).map((i, n) => (
            <PressableScale key={i.id} onPress={() => open(i)} scaleTo={0.98} style={[styles.listRow, n > 0 && styles.sep]} accessibilityRole="button">
              {imageOf(i) ? <Image source={{ uri: imageOf(i) }} style={styles.thumb} /> : <View style={[styles.thumb, { backgroundColor: withAlpha(meta?.accent || colors.text, 0.2) }]} />}
              <View style={styles.flex}>
                <Text style={styles.listTitle} numberOfLines={2}>{i.title}</Text>
                <Text style={styles.listSub} numberOfLines={1}>{[kindLabel(i), fmtNewsDate(i.date)].filter(Boolean).join(" · ")}{i.article ? "" : " ↗"}</Text>
              </View>
            </PressableScale>
          ))}
        </Card>
        <Text style={styles.source}>{t("news.source")}</Text>
      </View>
    );
  }

  // ----- Todo -----
  const top = featured(items);
  const patches = items.filter(i => i.kind === "patch" && !top.some(f => f.id === i.id)).slice(0, 10);
  const esports = items.filter(i => i.kind === "champion" || i.kind === "esports").slice(0, 6);
  const events = items.filter(i => (i.kind === "event" || i.kind === "news") && !top.some(f => f.id === i.id)).slice(0, 10);
  return (
    <View>
      <HeroCarousel items={top} onOpen={open} kindLabel={kindLabel} metaLine={metaLine} cta={cta} />
      {chips}

      {patches.length ? (
        <Rail title={t("news.patchNotes")}>
          {patches.map(i => <NewsCard key={i.id} item={i} sub={fmtNewsDate(i.date)} onPress={() => open(i)} />)}
        </Rail>
      ) : null}

      {esports.length ? (
        <>
          <Text style={styles.section}>{t("news.esports")}</Text>
          {esports.map(i => i.kind === "champion" ? (
            <PressableScale key={i.id} onPress={() => open(i)} scaleTo={0.98} style={styles.champion} accessibilityRole="button">
              <TeamCrest team={i.champion.team} size={sizes.avatarLg + spacing.xs} />
              <View style={styles.flex}>
                <GamePill game={i.game} label={i.champion.event} />
                <Text style={styles.championTitle} numberOfLines={1}>{t("news.championTitle", { team: i.champion.team.name })}</Text>
                <Text style={styles.listSub} numberOfLines={1}>{metaLine(i)}</Text>
              </View>
            </PressableScale>
          ) : (
            <PressableScale key={i.id} onPress={() => open(i)} scaleTo={0.98} style={[styles.listRow, styles.esportsRow]} accessibilityRole="button">
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
          {events.map(i => <NewsCard key={i.id} item={i} wide sub={i.summary || fmtNewsDate(i.date)} onPress={() => open(i)} />)}
        </Rail>
      ) : null}
      <Text style={styles.source}>{t("news.source")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex:         { flex: 1 },
  skelRow:      { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  chips:        { marginTop: spacing.md, flexGrow: 0 },
  section:      { ...type.section, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  gameHero:     { minHeight: sizes.chart * 2, borderRadius: radii.xl, overflow: "hidden", justifyContent: "flex-end", backgroundColor: colors.surfaceRaised },
  gameHeroBody: { padding: spacing.md, paddingTop: sizes.chart * 0.9 },
  gameName:     { ...type.largeTitle, marginTop: spacing.sm },
  gameSub:      { ...type.caption, color: colors.textSecondary, marginTop: spacing.xxs },
  listRow:      { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.sm },
  esportsRow:   { borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: sizes.hairline, borderColor: colors.border, marginBottom: spacing.sm },
  sep:          { borderTopWidth: sizes.hairline, borderTopColor: colors.border },
  thumb:        { width: sizes.avatarHero, height: sizes.avatarHero * 0.6, borderRadius: radii.md },
  listTitle:    { ...type.smallStrong, color: colors.text },
  listSub:      { ...type.micro, color: colors.textMuted, marginTop: spacing.xxs },
  champion:     { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radii.lg, borderWidth: sizes.hairline, borderColor: withAlpha(colors.gold, 0.4), backgroundColor: withAlpha(colors.gold, 0.08), marginBottom: spacing.sm },
  championTitle:{ ...type.heading, color: colors.text, marginTop: spacing.xs },
  source:       { ...type.micro, color: colors.textMuted, marginTop: spacing.lg },
});
