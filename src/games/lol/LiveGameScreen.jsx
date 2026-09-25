import React, { useCallback, useEffect, useState } from "react";
import { useT } from "../../i18n/I18nProvider";
import { View, Text, ScrollView, RefreshControl, StyleSheet, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Card, SectionLabel, EmptyState, ErrorState, LiveDot, PressableScale, Skeleton } from "../../components/ui";
import RankEmblem from "../../components/RankEmblem";
import Icon from "../../components/Icon";
import Mini from "./components/Mini";
import { getLive } from "./api";
import { ensureLolAssets, spellIcon, perkIcon } from "./assets";
import { queueLabel } from "./utils";
import { championByKey, championIcon, championLabel, championSplash } from "../../api/ddragon";
import { errorMessage, formatDuration, tierLabel, winrate } from "../../utils/format";
import { colors, radii, sizes, spacing, fontSizes, type, useAccent, withAlpha } from "../../theme";

const GAME = "lol";
const REFRESH_MS = 30_000;
const TEAMS = [
  { id: 100, label: "live.blueTeam", color: colors.info },
  { id: 200, label: "live.redTeam", color: colors.loss },
];

const champIcon = id => {
  const c = championByKey(id);
  return c ? championIcon(c.name) : null;
};

// "Nombre#TAG" -> { gameName, tagLine }
function splitRiotId(riotId) {
  const cut = String(riotId || "").lastIndexOf("#");
  return cut < 0 ? null : { gameName: riotId.slice(0, cut), tagLine: riotId.slice(cut + 1) };
}

function PlayerRow({ p, isMe, region, accent }) {
  const t = useT();
  const navigation = useNavigation();
  const champ = championByKey(p.championId);
  const target = splitRiotId(p.riotId);
  const rank = p.ranked;
  const wr = rank ? winrate(rank.wins, rank.losses) : null;

  const content = (
    <View style={[styles.player, isMe && { borderColor: accent, backgroundColor: withAlpha(accent, 0.08) }]}>
      <Mini uri={champIcon(p.championId)} size={sizes.placement} />
      <View style={styles.loadout}>
        <Mini uri={spellIcon(p.spell1Id)} size={sizes.avatarXs - spacing.xxs} />
        <Mini uri={spellIcon(p.spell2Id)} size={sizes.avatarXs - spacing.xxs} />
      </View>
      <View style={styles.loadout}>
        <Mini uri={perkIcon(p.keystone)} size={sizes.avatarXs - spacing.xxs} round />
        <Mini uri={perkIcon(p.secondary)} size={sizes.avatarXs - spacing.xxs} round />
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, isMe && { color: accent }]} numberOfLines={1}>
          {p.bot ? t("live.bot") : (target?.gameName || p.riotId || t("common.player"))}
        </Text>
        <Text style={styles.champName} numberOfLines={1}>{champ ? championLabel(champ.name) : t("live.champion")}</Text>
      </View>
      <View style={styles.rank}>
        {rank ? (
          <>
            <RankEmblem tier={rank.tier} size={sizes.item} />
            <View>
              <Text style={styles.rankText} numberOfLines={1}>{tierLabel(rank.tier, rank.rank)}</Text>
              <Text style={styles.rankSub}>{rank.leaguePoints} LP · {wr}%</Text>
            </View>
          </>
        ) : (
          <Text style={styles.rankSub}>{p.bot ? "—" : t("common.noRank")}</Text>
        )}
      </View>
    </View>
  );

  if (!target || p.bot) return content;
  return (
    <PressableScale
      scaleTo={0.985}
      haptic
      onPress={() => navigation.navigate("Profile", { gameId: GAME, gameName: target.gameName, tagLine: target.tagLine, region })}
    >
      {content}
    </PressableScale>
  );
}

function BanRow({ bans, color }) {
  if (!bans.length) return null;
  return (
    <View style={styles.bans}>
      {bans.map((b, i) => (
        <View key={`${b.championId}-${i}`} style={[styles.ban, { borderColor: withAlpha(color, 0.5) }]}>
          <Mini uri={b.championId > 0 ? champIcon(b.championId) : null} size={sizes.item + spacing.xs} />
          <View style={styles.banMark}><Icon name="close" size={fontSizes.xs} color={colors.loss} /></View>
        </View>
      ))}
    </View>
  );
}

// Partida en vivo de un jugador de LoL: los dos equipos con campeón, hechizos, runas y rango.
// params: { puuid, region, riotId? }  (riotId = "Nombre#TAG", para poder abrir el perfil cuando la partida ya terminó)
export default function LiveGameScreen({ route }) {
  const t = useT();
  const navigation = useNavigation();
  const { puuid, region, riotId } = route.params;
  const accent = useAccent(GAME);
  const [state, setState] = useState({ status: "loading" });   // loading | live | ended | error
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());
  const target = splitRiotId(riotId);

  const load = useCallback(async () => {
    try {
      const [live] = await Promise.all([getLive(puuid, region), ensureLolAssets()]);
      setState(live.inGame ? { status: "live", live } : { status: "ended" });
    } catch (e) {
      // Si ya había una partida en pantalla, se conserva y solo se avisa al recargar manualmente
      setState(prev => (prev.status === "live" ? prev : { status: "error", message: errorMessage(e, t("live.loadError")) }));
    }
  }, [puuid, region]);

  useEffect(() => { load(); }, [load]);

  // Se refresca sola mientras haya partida, y el cronómetro avanza cada segundo
  useEffect(() => {
    if (state.status !== "live") return undefined;
    const refresh = setInterval(load, REFRESH_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(refresh); clearInterval(tick); };
  }, [state.status, load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (state.status === "loading") {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Skeleton height={sizes.iconHero} radius={radii.lg} style={styles.gap} />
          <Skeleton height={sizes.chart * 2} radius={radii.lg} style={styles.gap} />
          <Skeleton height={sizes.chart * 2} radius={radii.lg} />
        </View>
      </View>
    );
  }
  if (state.status === "error") {
    return <View style={styles.center}><ErrorState message={state.message} onRetry={() => { setState({ status: "loading" }); load(); }} /></View>;
  }
  if (state.status === "ended") {
    return (
      <View style={styles.center}>
        <EmptyState
          icon="gamepad"
          title={t("live.endedTitle")}
          text={t("live.endedText")}
          actionLabel={target ? t("live.viewProfile") : undefined}
          onAction={target ? () => navigation.navigate("Profile", { gameId: GAME, gameName: target.gameName, tagLine: target.tagLine, region }) : undefined}
        />
      </View>
    );
  }

  const { live } = state;
  const me = live.participants.find(p => p.puuid === puuid);
  const meChamp = championByKey(me?.championId);
  const splash = meChamp ? championSplash(meChamp.name) : null;
  const meName = splitRiotId(me?.riotId || riotId)?.gameName;
  const elapsed = live.startTime > 0 ? Math.max(0, Math.floor((now - live.startTime) / 1000)) : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
    >
      <View style={[styles.hero, { borderColor: withAlpha(colors.loss, 0.5) }]}>
        {splash ? <Image source={{ uri: splash }} style={StyleSheet.absoluteFill} blurRadius={4} resizeMode="cover" /> : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(colors.bg, splash ? 0.66 : 0.9) }]} />
        <View style={styles.liveBadge}>
          <LiveDot size={sizes.dot + 1} />
          <Text style={styles.liveText}>{t("live.badge")}</Text>
        </View>
        {meName ? <Text style={styles.heroName} numberOfLines={1}>{meName}{meChamp ? ` · ${championLabel(meChamp.name)}` : ""}</Text> : null}
        <Text style={styles.mode}>{queueLabel(live.queueId)}</Text>
        <Text style={styles.timer}>{elapsed == null ? t("live.loading") : formatDuration(elapsed)}</Text>
      </View>

      {TEAMS.map(team => {
        const players = live.participants.filter(p => p.teamId === team.id);
        const bans = live.bans.filter(b => b.teamId === team.id);
        return (
          <Card key={team.id} accent={team.color}>
            <View style={styles.teamHeader}>
              <SectionLabel style={styles.teamLabel}>{t(team.label)}</SectionLabel>
              <BanRow bans={bans} color={team.color} />
            </View>
            {players.map((p, i) => (
              <PlayerRow key={p.puuid || `bot-${team.id}-${i}`} p={p} isMe={p.puuid === puuid} region={region} accent={accent} />
            ))}
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.bg },
  content:    { padding: spacing.lg, paddingBottom: spacing.xxxl },
  center:     { flex: 1, backgroundColor: colors.bg, justifyContent: "center" },
  gap:        { marginBottom: spacing.lg },
  hero:       { alignItems: "center", gap: spacing.xs, padding: spacing.xl, marginBottom: spacing.lg, borderRadius: radii.lg, borderWidth: sizes.hairline, overflow: "hidden", backgroundColor: colors.surface },
  heroName:   { ...type.bodyStrong, fontSize: 15, color: colors.textSecondary },
  liveBadge:  { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  liveText:   { ...type.label, color: colors.loss },
  mode:       { ...type.heading, color: colors.text },
  timer:      { ...type.statLarge, color: colors.text },
  teamHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  teamLabel:  { marginBottom: 0 },
  bans:       { flexDirection: "row", gap: spacing.xs },
  ban:        { borderWidth: sizes.hairline, borderRadius: radii.xs, overflow: "hidden", opacity: 0.85 },
  banMark:    { position: "absolute", right: 0, bottom: 0 },
  player:     {
    flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.sm, marginBottom: spacing.sm,
    borderWidth: sizes.hairline, borderColor: "transparent", borderRadius: radii.md, backgroundColor: colors.bg,
  },
  loadout:    { gap: spacing.xxs },
  info:       { flex: 1, minWidth: 0 },
  name:       { ...type.smallStrong, color: colors.text },
  champName:  { ...type.caption, color: colors.textMuted },
  rank:       { flexDirection: "row", alignItems: "center", gap: spacing.xs, maxWidth: "42%" },
  rankText:   { ...type.captionStrong, color: colors.text },
  rankSub:    { ...type.micro, color: colors.textMuted },
});
