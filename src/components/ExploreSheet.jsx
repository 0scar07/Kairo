import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Image, ScrollView, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { useT } from "../i18n/I18nProvider";
import { Chip, PressableScale, RowSkeleton, Sheet, SegmentedTabs, showHud } from "./ui";
import Icon from "./Icon";
import GameLogo from "./GameLogo";
import RankEmblem from "./RankEmblem";
import { LeaderboardHead, LeaderboardRow } from "../games/lol/components/LeaderboardTable";
import { getLeaderboard, getLive } from "../games/lol/api";
import { getProLeague, getProLeagues, tournamentLabel } from "../games/lol/esports";
import ProStandings from "../games/lol/components/ProStandings";
import MatchupsTab from "../games/lol/components/MatchupsTab";
import NewsTab from "../news/NewsTab";
import ClipsTab from "../clips/ClipsTab";
import { queueLabel } from "../games/lol/utils";
import { championByKey, championIcon, profileIconUrl } from "../api/ddragon";
import { getRegion } from "../constants/regions";
import { loadFavorites } from "../utils/favorites";
import { loadMyProfiles } from "../utils/prefs";
import { errorMessage, formatDuration, tierLabel } from "../utils/format";
import { useBootData } from "../boot/BootContext";
import { colors, radii, sizes, spacing, fontSizes, type, tracking, useActiveGame, accents, withAlpha } from "../theme";

const SHEET_ROWS = 10;      // jugadores del ranking que caben en la hoja; el resto en la pantalla del ranking
const MAX_LIVE = 10;        // favoritos que se consultan a la vez (cada consulta pasa por la caché del servidor)
const TIERS = ["challenger", "grandmaster", "master"];
const QUEUES = ["RANKED_SOLO_5x5", "RANKED_FLEX_SR"];

/**
 * Hoja "Explorar" del botón de la lupa: descubrir jugadores de League of Legends sin escribir su nombre.
 *  - Noticias: lo último de todos los juegos (carrusel, parches para leer en la app y esports; ver src/news/).
 *  - Clips: los Shorts oficiales de cada juego en un visor a pantalla completa tipo TikTok (ver src/clips/).
 *  - Ranking: el top de la región (Challenger, Gran Maestro o Maestro; Solo/Dúo o Flex) como tabla.
 *  - En vivo: los favoritos de LoL que están en partida ahora.
 *  - Enfrentamientos: tu campeón contra un rival (build, habilidades y counters; ver games/lol/MatchupScreen.jsx).
 * Arriba lleva a la búsqueda por Riot ID y abajo hay atajos a Mi perfil y Comparar.
 */
export default function ExploreSheet({ visible, onClose, navigation }) {
  const t = useT();
  const { region } = useBootData();
  const { setGameId } = useActiveGame();
  const [tab, setTab] = useState("news");
  const [tier, setTier] = useState("challenger");
  const [queue, setQueue] = useState("RANKED_SOLO_5x5");
  const [ranking, setRanking] = useState({ status: "loading" });   // loading | ready | error
  const [live, setLive] = useState({ status: "loading", list: [] }); // loading | ready (list: [{ fav, game }])
  const [attempt, setAttempt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const { height } = useWindowDimensions();

  // Ranking: se pide al abrir la hoja y al cambiar de liga, cola o región
  useEffect(() => {
    if (!visible) return undefined;
    let alive = true;
    setRanking({ status: "loading" });
    getLeaderboard(region, { tier, queue, limit: SHEET_ROWS })
      .then(r => { if (alive) setRanking({ status: "ready", ...r }); })
      .catch(e => { if (alive) setRanking({ status: "error", message: errorMessage(e) }); });
    return () => { alive = false; };
  }, [visible, region, tier, queue, attempt]);

  // En vivo: qué favoritos de LoL están en partida (se consulta al abrir la hoja)
  const checkLive = useCallback(async () => {
    setLive(prev => ({ ...prev, status: "loading" }));
    const favs = (await loadFavorites().catch(() => [])).filter(f => f.gameId === "lol" && f.puuid).slice(0, MAX_LIVE);
    const results = await Promise.allSettled(favs.map(f => getLive(f.puuid, f.region)));
    const list = results
      .map((r, i) => (r.status === "fulfilled" && r.value?.inGame ? { fav: favs[i], game: r.value } : null))
      .filter(Boolean);
    setLive({ status: "ready", list, favorites: favs.length });
  }, []);
  useEffect(() => { if (visible) checkLive(); }, [visible, checkLive]);

  // Cronómetro de las partidas en vivo
  useEffect(() => {
    if (!visible || tab !== "live" || !live.list.length) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [visible, tab, live.list.length]);

  // Cierra la hoja y abre la pantalla pedida
  function go(screen, params) {
    onClose();
    navigation.navigate(screen, params);
  }

  async function openCompare() {
    const mine = (await loadMyProfiles().catch(() => ({}))).lol;
    if (!mine) {
      setGameId("lol");
      showHud(t("explore.setupProfile"), "edit");
      go("MyProfile");
      return;
    }
    go("Compare", { a: { gameName: mine.gameName, tagLine: mine.tagLine, region: mine.region || region } });
  }

  const tabs = [
    { key: "news", label: t("explore.tabNews") },
    { key: "clips", label: t("explore.tabClips") },
    { key: "ranking", label: t("explore.tabRanking") },
    { key: "live", label: live.list.length ? `${t("explore.tabLive")} · ${live.list.length}` : t("explore.tabLive") },
    { key: "pros", label: t("explore.tabPros") },
    { key: "matchups", label: t("explore.tabMatchups") },
  ];

  return (
    <Sheet visible={visible} onClose={onClose}>
      <ScrollView style={[styles.scroll, { minHeight: height * 0.62 }]} bounces={false} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">{t("explore.title")}</Text>
          <View style={styles.context}>
            <GameLogo game="lol" size={fontSizes.base} color={accents.lol} />
            <Text style={styles.contextText}>LoL · {getRegion(region).label}</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>{t("explore.subtitle")}</Text>

        <Pressable
          onPress={() => go("Search")}
          style={({ pressed }) => [styles.find, pressed && styles.findPressed]}
          accessibilityRole="search"
          accessibilityLabel={t("explore.find")}
        >
          <Icon name="search" size={fontSizes.lg} color={colors.textMuted} />
          <Text style={styles.findText}>{t("explore.find")}</Text>
        </Pressable>

        <View style={styles.tabs}><SegmentedTabs tabs={tabs} value={tab} onChange={setTab} game="lol" scroll /></View>

        {tab === "news" ? (
          <NewsTab visible={visible && tab === "news"} onArticle={a => go("NewsArticle", a)} onMatch={id => go("VALMatch", { id })} onClip={p => go("Clips", p)} />
        ) : tab === "clips" ? (
          <ClipsTab visible={visible && tab === "clips"} onOpen={p => go("Clips", p)} />
        ) : tab === "ranking" ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
              {QUEUES.map(q => <Chip key={q} label={q === "RANKED_SOLO_5x5" ? t("ranked.solo") : t("ranked.flex")} active={queue === q} game="lol" onPress={() => setQueue(q)} />)}
              {TIERS.map(x => (
                <Chip key={x} label={tierLabel(x.toUpperCase())} active={tier === x} game="lol" icon={<RankEmblem tier={x.toUpperCase()} size={sizes.avatarXs} />} onPress={() => setTier(x)} />
              ))}
            </ScrollView>
            <View style={styles.table}>
              <LeaderboardHead />
              {ranking.status === "loading" ? <><RowSkeleton /><RowSkeleton /><RowSkeleton /></> : null}
              {ranking.status === "error" ? (
                <View style={styles.message}>
                  <Text style={styles.messageText}>{t("explore.rankingError", { error: ranking.message })}</Text>
                  <PressableScale onPress={() => setAttempt(n => n + 1)} style={styles.retry}><Text style={styles.retryText}>{t("common.retry")}</Text></PressableScale>
                </View>
              ) : null}
              {ranking.status === "ready" && !ranking.players.length ? (
                <View style={styles.message}><Text style={styles.messageText}>{t("explore.rankingEmpty")}</Text></View>
              ) : null}
              {ranking.status === "ready" ? ranking.players.map((p, i) => (
                <LeaderboardRow
                  key={p.puuid}
                  player={p}
                  position={i + 1}
                  onPress={() => go("Profile", { gameId: "lol", gameName: p.gameName, tagLine: p.tagLine, region })}
                />
              )) : null}
            </View>
            {ranking.status === "ready" && ranking.total > ranking.players.length ? (
              <Pressable onPress={() => go("Leaderboard", { region, tier, queue })} style={styles.more} accessibilityRole="button">
                <Text style={styles.moreText}>{t("explore.seeAll", { count: ranking.total, tier: tierLabel(tier.toUpperCase()) })}</Text>
                <Icon name="chevron" size={fontSizes.lg} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </>
        ) : tab === "live" ? (
          <View style={styles.liveList}>
            {live.status === "loading" ? <><RowSkeleton /><RowSkeleton /></> : null}
            {live.status === "ready" && live.list.map(({ fav, game }) => {
              const me = game.participants?.find(p => p.puuid === fav.puuid);
              const champ = me ? championByKey(me.championId) : null;
              const elapsed = game.startTime > 0 ? Math.max(0, Math.floor((now - game.startTime) / 1000)) : null;
              return (
                <PressableScale
                  key={fav.puuid}
                  haptic
                  scaleTo={0.98}
                  style={styles.live}
                  onPress={() => go("LiveGame", { puuid: fav.puuid, region: fav.region, riotId: `${fav.gameName}#${fav.tagLine}` })}
                  accessibilityLabel={`${fav.gameName}, ${t("live.badge")}, ${queueLabel(game.queueId)}${champ ? `, ${champ.name}` : ""}`}
                >
                  <View>
                    {fav.iconId != null
                      ? <Image source={{ uri: profileIconUrl(fav.iconId) }} style={[styles.liveAvatar, { borderColor: colors.tier[fav.tier] || colors.borderStrong }]} />
                      : <View style={[styles.liveAvatar, styles.liveAvatarEmpty]}><GameLogo game="lol" size={sizes.item} color={accents.lol} /></View>}
                    {champ ? <Image source={{ uri: championIcon(champ.id) }} style={styles.liveChamp} /> : null}
                  </View>
                  <View style={styles.liveText}>
                    <Text style={styles.liveName} numberOfLines={1}>{fav.gameName}</Text>
                    <Text style={styles.liveMeta} numberOfLines={1}>{queueLabel(game.queueId)}{champ ? ` · ${champ.name}` : ""} · {getRegion(fav.region).label}</Text>
                  </View>
                  <View style={styles.liveRight}>
                    <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveBadgeText}>{t("live.badge")}</Text></View>
                    <Text style={styles.clock}>{elapsed != null ? formatDuration(elapsed) : "…"}</Text>
                  </View>
                </PressableScale>
              );
            })}
            {live.status === "ready" && live.list.length ? <Text style={styles.hint}>{t("explore.liveHint")}</Text> : null}
            {live.status === "ready" && !live.list.length ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>{live.favorites ? t("explore.nobodyLive") : t("explore.noFavorites")}</Text>
                {live.favorites ? (
                  <PressableScale onPress={checkLive} style={styles.retry}><Text style={styles.retryText}>{t("explore.checkAgain")}</Text></PressableScale>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : tab === "pros" ? (
          <ProsTab visible={visible} onTeam={(team, ctx) => go("ProTeam", { slug: team.slug, ...ctx })} />
        ) : <MatchupsTab visible={visible && tab === "matchups"} onOpen={params => go("Matchup", params)} />}

        <View style={styles.shortcuts}>
          <Shortcut icon="user" color="#0A84FF" label={t("explore.myProfile")} hint={t("explore.myProfileHint")} onPress={() => go("MyProfile")} />
          <Shortcut icon="compare" color={accents.lol} label={t("explore.compare")} hint={t("explore.compareHint")} onPress={openCompare} />
        </View>
      </ScrollView>
    </Sheet>
  );
}

// Pestaña Pros: ligas profesionales (LCK, LPL, LEC, LCS, LTA, LLA, Mundial y MSI) y su clasificación actual
function ProsTab({ visible, onTeam }) {
  const t = useT();
  const [leagues, setLeagues] = useState({ status: "loading", list: [] });
  const [slug, setSlug] = useState(null);
  const [league, setLeague] = useState({ status: "idle" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!visible) return undefined;
    let alive = true;
    getProLeagues()
      .then(list => { if (alive) { setLeagues({ status: "ready", list }); setSlug(prev => prev || list[0]?.slug || null); } })
      .catch(e => { if (alive) setLeagues({ status: "error", list: [], message: errorMessage(e) }); });
    return () => { alive = false; };
  }, [visible, attempt]);

  useEffect(() => {
    if (!slug) return undefined;
    let alive = true;
    setLeague({ status: "loading" });
    getProLeague(slug)
      .then(d => { if (alive) setLeague({ status: "ready", ...d }); })
      .catch(e => { if (alive) setLeague({ status: "error", message: errorMessage(e) }); });
    return () => { alive = false; };
  }, [slug, attempt]);

  if (leagues.status === "error") {
    return (
      <View style={styles.message}>
        <Text style={styles.messageText}>{t("pros.loadError", { error: leagues.message })}</Text>
        <PressableScale onPress={() => setAttempt(n => n + 1)} style={styles.retry}><Text style={styles.retryText}>{t("common.retry")}</Text></PressableScale>
      </View>
    );
  }

  const tournament = league.status === "ready" ? league.tournaments?.find(x => x.id === league.tournamentId) : null;
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        {leagues.list.map(l => (
          <Chip
            key={l.slug}
            label={l.short}
            active={l.slug === slug}
            game="lol"
            icon={l.image ? <Image source={{ uri: l.image }} style={styles.leagueLogo} resizeMode="contain" /> : null}
            onPress={() => setSlug(l.slug)}
          />
        ))}
      </ScrollView>
      {leagues.status === "loading" || league.status === "loading" ? <><RowSkeleton /><RowSkeleton /><RowSkeleton /></> : null}
      {league.status === "error" ? (
        <View style={styles.message}>
          <Text style={styles.messageText}>{t("pros.loadError", { error: league.message })}</Text>
          <PressableScale onPress={() => setAttempt(n => n + 1)} style={styles.retry}><Text style={styles.retryText}>{t("common.retry")}</Text></PressableScale>
        </View>
      ) : null}
      {league.status === "ready" ? (
        <>
          {tournament ? <Text style={styles.tournament}>{league.league.name} · {tournamentLabel(tournament.slug, league.league.slug)}</Text> : null}
          {league.fromResults ? <Text style={styles.source}>{t("pros.fromResults")}</Text> : null}
          {league.standings.length
            ? <ProStandings sections={league.standings} onTeam={team => onTeam(team, { leagueSlug: league.league.slug, tournamentId: league.tournamentId })} />
            : <View style={styles.empty}><Text style={styles.emptyText}>{t("pros.noStandings")}</Text></View>}
          <Text style={styles.source}>{t("pros.source")}</Text>
        </>
      ) : null}
    </>
  );
}

function Shortcut({ icon, color, label, hint, onPress }) {
  return (
    <PressableScale haptic scaleTo={0.97} onPress={onPress} style={styles.shortcut} accessibilityLabel={`${label}. ${hint}`}>
      <View style={[styles.shortcutIcon, { backgroundColor: color }]}><Icon name={icon} size={fontSizes.lg} color="#FFFFFF" strokeWidth={2.2} /></View>
      <View style={styles.shortcutText}>
        <Text style={styles.shortcutLabel} numberOfLines={1}>{label}</Text>
        <Text style={styles.shortcutHint} numberOfLines={1}>{hint}</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  scroll:        { flexShrink: 1 },
  head:          { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  title:         { ...type.largeTitle, fontSize: fontSizes.xxxl, color: colors.text },
  context:       {
    flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + spacing.xxs,
    borderRadius: radii.pill, borderWidth: sizes.hairline, borderColor: withAlpha(accents.lol, 0.4), backgroundColor: withAlpha(accents.lol, 0.12),
  },
  contextText:   { ...type.smallStrong, color: accents.lol },
  subtitle:      { ...type.small, color: colors.textMuted, marginTop: spacing.xxs },
  find:          {
    flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: sizes.button - spacing.xxs, marginTop: spacing.lg,
    paddingHorizontal: spacing.md, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: sizes.hairline, borderColor: colors.border,
  },
  findPressed:   { backgroundColor: colors.surfaceRaised },
  findText:      { ...type.body, color: colors.textMuted },
  tabs:          { marginTop: spacing.md, marginBottom: -spacing.xs },
  chips:         { marginBottom: spacing.md },
  table:         { borderRadius: radii.lg, overflow: "hidden", borderWidth: sizes.hairline, borderColor: colors.border, backgroundColor: colors.surface },
  message:       { padding: spacing.lg, gap: spacing.md, alignItems: "flex-start", borderTopWidth: sizes.hairline, borderTopColor: colors.border },
  messageText:   { ...type.small, color: colors.textSecondary },
  retry:         { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.pill, borderWidth: sizes.hairline, borderColor: colors.borderStrong },
  retryText:     { ...type.smallStrong, color: colors.text },
  more:          { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: sizes.placement, marginTop: spacing.xs },
  moreText:      { ...type.smallStrong, color: colors.textSecondary, flex: 1 },
  liveList:      { gap: spacing.sm },
  live:          {
    flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md,
    borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: sizes.hairline, borderColor: colors.border,
  },
  liveAvatar:    { width: sizes.avatarLg + spacing.sm, height: sizes.avatarLg + spacing.sm, borderRadius: radii.pill, borderWidth: sizes.borderThick, backgroundColor: colors.surfaceHigh },
  liveAvatarEmpty: { alignItems: "center", justifyContent: "center", borderColor: colors.borderStrong },
  liveChamp:     { position: "absolute", right: -spacing.sm + spacing.xxs, bottom: -spacing.xs, width: sizes.item + spacing.xxs, height: sizes.item + spacing.xxs, borderRadius: radii.sm, borderWidth: sizes.borderThick, borderColor: colors.surface },
  liveText:      { flex: 1, minWidth: 0 },
  liveName:      { ...type.bodyStrong, fontSize: fontSizes.base, color: colors.text },
  liveMeta:      { ...type.caption, color: colors.textMuted },
  liveRight:     { alignItems: "flex-end" },
  liveBadge:     { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  liveDot:       { width: sizes.dot + 1, height: sizes.dot + 1, borderRadius: radii.pill, backgroundColor: colors.loss },
  liveBadgeText: { ...type.micro, fontFamily: type.captionStrong.fontFamily, color: colors.loss, letterSpacing: tracking.wide },
  clock:         { ...type.stat, color: colors.text, fontVariant: ["tabular-nums"] },
  hint:          { ...type.caption, color: colors.textMuted, marginTop: spacing.xs },
  empty:         { padding: spacing.lg, gap: spacing.md, alignItems: "flex-start", borderRadius: radii.lg, borderWidth: sizes.hairline, borderStyle: "dashed", borderColor: colors.borderStrong },
  emptyText:     { ...type.small, color: colors.textSecondary },
  leagueLogo:    { width: sizes.avatarXs, height: sizes.avatarXs },
  tournament:    { ...type.smallStrong, color: colors.textSecondary, marginBottom: spacing.sm },
  source:        { ...type.micro, color: colors.textMuted, marginTop: spacing.xs },
  shortcuts:     { flexDirection: "row", gap: spacing.sm + spacing.xxs, marginTop: spacing.lg, marginBottom: spacing.sm },
  shortcut:      { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm + spacing.xxs, padding: spacing.md, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: sizes.hairline, borderColor: colors.border },
  shortcutIcon:  { width: sizes.avatarMd - spacing.xxs, height: sizes.avatarMd - spacing.xxs, borderRadius: radii.sm + spacing.xxs, alignItems: "center", justifyContent: "center" },
  shortcutText:  { flex: 1, minWidth: 0 },
  shortcutLabel: { ...type.bodyStrong, color: colors.text },
  shortcutHint:  { ...type.caption, color: colors.textMuted },
});
