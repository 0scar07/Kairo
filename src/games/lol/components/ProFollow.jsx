import React, { useEffect, useState } from "react";
import { View, Text, Image, StyleSheet, Platform } from "react-native";
import { Card, PressableScale, showHud } from "../../../components/ui";
import BellButton from "../../../notifications/BellButton";
import { getPermission, requestPermission } from "../../../notifications/push";
import { syncProAlerts } from "../../../notifications/proAlerts";
import { getProNext } from "../esports";
import { isFollowing, loadFollowedPros, setProAlerts, toggleFollowPro } from "../../../utils/followedPros";
import { activeLanguage } from "../../../i18n";
import { useT } from "../../../i18n/I18nProvider";
import { select, success } from "../../../utils/haptics";
import { colors, radii, sizes, spacing, type, useAccent, withAlpha } from "../../../theme";

// "sáb 25 oct · 04:00" en el idioma y la hora del celular
export const matchTime = iso => {
  const d = new Date(iso);
  const day = d.toLocaleDateString(activeLanguage(), { weekday: "short", day: "numeric", month: "short" });
  const time = d.toLocaleTimeString(activeLanguage(), { hour: "2-digit", minute: "2-digit" });
  return `${day} · ${time}`;
};

function TeamMark({ code, image }) {
  return (
    <View style={styles.mark}>
      {image ? <Image source={{ uri: image }} style={styles.markImg} resizeMode="contain" /> : <Text style={styles.markCode}>{code || "TBD"}</Text>}
      <Text style={styles.markName} numberOfLines={1}>{code || "TBD"}</Text>
    </View>
  );
}

// Tarjeta de la próxima partida oficial de un equipo (o el aviso de que no hay ninguna programada)
export function NextMatchCard({ slug, team }) {
  const t = useT();
  const [next, setNext] = useState(undefined);   // undefined = cargando, null = sin partida

  useEffect(() => {
    let alive = true;
    getProNext(slug).then(r => { if (alive) setNext(r?.next ?? null); }).catch(() => { if (alive) setNext(null); });
    return () => { alive = false; };
  }, [slug]);

  if (next === undefined) return null;
  return (
    <View style={styles.block}>
      <Text style={styles.label}>{t("proFollow.next")}</Text>
      {next ? (
        <Card style={styles.match} accessible accessibilityLabel={`${team.code} vs ${next.opponent?.code || "TBD"}, ${matchTime(next.startTime)}`}>
          <TeamMark code={team.code} image={team.image} />
          <View style={styles.vs}>
            {next.state === "inProgress"
              ? <Text style={[styles.when, { color: colors.loss }]}>{t("proFollow.live")}</Text>
              : <Text style={styles.when}>{matchTime(next.startTime)}</Text>}
            <Text style={styles.meta} numberOfLines={2}>
              {[next.league?.name, next.block, next.bestOf ? `Bo${next.bestOf}` : null].filter(Boolean).join(" · ")}
            </Text>
          </View>
          <TeamMark code={next.opponent?.code} image={next.opponent?.image} />
        </Card>
      ) : (
        <Text style={styles.none}>{t("proFollow.noNext")}</Text>
      )}
    </View>
  );
}

/**
 * Seguir a un pro: el botón "Seguir / Siguiendo", la campanita de avisos y su próxima partida oficial. El pro queda
 * guardado en el celular y se muestra en Favoritos; los avisos llegan 15 minutos antes de cada partida de su equipo.
 */
export default function ProFollow({ player, team, slug, leagueSlug }) {
  const t = useT();
  const accent = useAccent("lol");
  const [list, setList] = useState([]);

  useEffect(() => { loadFollowedPros().then(setList).catch(() => {}); }, []);

  const following = isFollowing(list, player.id);
  const me = list.find(p => p.playerId === player.id);
  const canAlert = Platform.OS !== "web";

  async function toggle() {
    select();
    const { list: next, following: now } = await toggleFollowPro({
      playerId: player.id, name: player.name, image: player.image, slug, leagueSlug,
      teamCode: team.code, teamName: team.name, teamImage: team.image,
    });
    setList(next);
    if (now) {
      success();
      showHud(t("proFollow.followed", { name: player.name }), "check");
      if (canAlert && (await getPermission()) === "undetermined") await requestPermission();
    }
    syncProAlerts().catch(() => {});
  }

  async function toggleAlerts() {
    const on = !(me?.alerts !== false);
    if (on && canAlert && (await getPermission()) !== "granted" && (await requestPermission()) !== "granted") {
      showHud(t("proFollow.permission"), "bellOff");
      return;
    }
    setList(await setProAlerts(player.id, on));
    syncProAlerts().catch(() => {});
  }

  return (
    <>
      <View style={styles.row}>
        <PressableScale
          onPress={toggle}
          style={[styles.follow, following ? { backgroundColor: accent } : { borderColor: withAlpha(accent, 0.7), borderWidth: sizes.hairline * 1.5 }]}
          accessibilityRole="button"
          accessibilityState={{ selected: following }}
        >
          <Text style={[styles.followText, { color: following ? colors.bg : accent }]}>{following ? t("proFollow.following") : t("proFollow.follow")}</Text>
        </PressableScale>
        {following && canAlert ? <BellButton active={me?.alerts !== false} accent={accent} onPress={toggleAlerts} size={sizes.item} style={styles.bell} /> : null}
      </View>
      {following && canAlert ? <Text style={styles.hint}>{me?.alerts !== false ? t("proFollow.alertsOn") : t("proFollow.alertsOff")}</Text> : null}
      <NextMatchCard slug={slug} team={team} />
    </>
  );
}

const styles = StyleSheet.create({
  row:        { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs },
  follow:     { flex: 1, minHeight: sizes.placement, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  followText: { ...type.bodyStrong },
  bell:       { width: sizes.placement, height: sizes.placement, alignItems: "center", justifyContent: "center", borderRadius: radii.md },
  hint:       { ...type.caption, color: colors.textMuted, marginBottom: spacing.xs },
  block:      { marginTop: spacing.md, marginBottom: spacing.lg },
  label:      { ...type.smallStrong, color: colors.textSecondary, marginBottom: spacing.sm },
  match:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.lg },
  mark:       { width: sizes.iconHero - spacing.lg, alignItems: "center", gap: spacing.xs },
  markImg:    { width: sizes.avatarLg + spacing.sm, height: sizes.avatarLg + spacing.sm },
  markCode:   { ...type.heading, color: colors.text },
  markName:   { ...type.smallStrong, color: colors.textSecondary },
  vs:         { flex: 1, alignItems: "center", gap: spacing.xxs },
  when:       { ...type.bodyStrong, color: colors.text, textAlign: "center" },
  meta:       { ...type.caption, color: colors.textMuted, textAlign: "center" },
  none:       { ...type.small, color: colors.textMuted },
});
