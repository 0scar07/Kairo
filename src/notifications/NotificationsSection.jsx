import React, { useEffect, useState } from "react";
import { View, Text, Switch, ScrollView, StyleSheet, Alert } from "react-native";
import Animated, { FadeInDown, FadeOut, LinearTransition, useReducedMotion } from "react-native-reanimated";
import { Card, Chip, SectionLabel, SettingRow } from "../components/ui";
import Icon from "../components/Icon";
import TimeStepper from "./TimeStepper";
import { useNotifications } from "./NotificationsProvider";
import { useT } from "../i18n/I18nProvider";
import { errorMessage } from "../utils/format";
import { emitLive } from "./events";
import { loadFollowedTeams, onFollowedTeamsChanged } from "../utils/followedTeams";
import { accents, colors, sizes, spacing, type, withAlpha } from "../theme";

// Juegos con notas del parche que el servidor puede avisar (server/lib/patchTracker.js)
const PATCH_GAMES = [["lol", "LoL"], ["tft", "TFT"], ["valorant", "VAL"], ["wildrift", "WR"], ["dota2", "Dota 2"], ["apex", "Apex"], ["pubg", "PUBG"]];

// Ajustes > Notificaciones: interruptor general, qué avisar, horario silencioso, estado del permiso y una prueba
export default function NotificationsSection() {
  const t = useT();
  const { supported, permission, prefs, setPref, openSystemSettings, askPermission, sendTest } = useNotifications();
  const [sending, setSending] = useState(false);
  const [teams, setTeams] = useState([]);
  const reduce = useReducedMotion();
  useEffect(() => {
    loadFollowedTeams().then(setTeams);
    return onFollowedTeamsChanged(setTeams);
  }, []);
  const patchGames = prefs.patchGames || ["lol"];
  // Elegir un juego más o uno menos; siempre queda al menos uno (para no avisar de nada, se apaga el interruptor)
  const togglePatchGame = id => {
    const next = patchGames.includes(id) ? patchGames.filter(g => g !== id) : [...patchGames, id];
    if (next.length) setPref({ patchGames: next });
  };
  const accent = accents.lol;
  const track = { false: colors.surfaceHigh, true: withAlpha(accent, 0.5) };
  const toggle = (value, onChange) => (
    <Switch value={value} onValueChange={onChange} trackColor={track} thumbColor={value ? accent : colors.textMuted} />
  );

  // Banner de ejemplo con datos ficticios: enseña cómo se ve un aviso con la app abierta
  function demo() {
    emitLive({
      id: `demo-${Date.now()}`, kind: "start", title: "", body: "",
      data: { demo: true, puuid: "demo", region: "la1", riotId: "Perico Bandit#LAN", iconId: 588, championId: 103, queueId: 420 },
    });
  }

  async function test() {
    setSending(true);
    try {
      await sendTest("live_start");
      Alert.alert(t("notif.testSent"), t("notif.testSentBody"));
    } catch (e) {
      Alert.alert(t("common.error"), t("notif.testFailed", { error: errorMessage(e) }));
    } finally {
      setSending(false);
    }
  }

  if (!supported) {
    return (
      <>
        <SectionLabel>{t("notif.section")}</SectionLabel>
        <Card>
          <Text style={styles.unsupported}>{t("notif.unsupported")}</Text>
        </Card>
      </>
    );
  }

  const off = !prefs.enabled;
  return (
    <>
      <SectionLabel>{t("notif.section")}</SectionLabel>
      <Card padded={false}>
        <SettingRow icon="bell" iconColor="#FF453A" label={t("notif.enable")} hint={t("notif.enableHint")} right={toggle(prefs.enabled, v => setPref({ enabled: v }))} />
        <View style={styles.divider} />
        <SettingRow icon="eye" iconColor="#30D158" label={t("notif.start")} disabled={off} right={toggle(prefs.notifyStart, v => setPref({ notifyStart: v }))} />
        <View style={styles.divider} />
        <SettingRow icon="check" iconColor="#64D2FF" label={t("notif.end")} disabled={off} right={toggle(prefs.notifyEnd, v => setPref({ notifyEnd: v }))} />
        <View style={styles.divider} />
        <SettingRow icon="clock" iconColor="#BF5AF2" label={t("notif.weekly")} hint={t("notif.weeklyHint")} disabled={off} right={toggle(prefs.weekly, v => setPref({ weekly: v }))} />
        <View style={styles.divider} />
        <SettingRow icon="trending" iconColor="#FFD60A" label={t("notif.rankAlerts")} hint={t("notif.rankAlertsHint")} disabled={off} right={toggle(prefs.rankAlerts, v => setPref({ rankAlerts: v }))} />
        <View style={styles.divider} />
        <SettingRow icon="trophy" iconColor="#FF9F0A" label={t("notif.trophyAlerts")} hint={t("notif.trophyAlertsHint")} disabled={off} right={toggle(prefs.trophyAlerts, v => setPref({ trophyAlerts: v }))} />
        <View style={styles.divider} />
        <SettingRow icon="news" iconColor="#35E0A1" label={t("notif.patchAlerts")} hint={t("notif.patchAlertsHint")} disabled={off} right={toggle(prefs.patchAlerts !== false, v => setPref({ patchAlerts: v }))} />
        {prefs.patchAlerts !== false && !off && (
          <Animated.View entering={reduce ? undefined : FadeInDown.duration(260)} exiting={reduce ? undefined : FadeOut.duration(160)} layout={reduce ? undefined : LinearTransition.springify().damping(18)}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {PATCH_GAMES.map(([id, label]) => <Chip key={id} label={label} game={id} active={patchGames.includes(id)} onPress={() => togglePatchGame(id)} />)}
            </ScrollView>
          </Animated.View>
        )}
        <View style={styles.divider} />
        <SettingRow
          icon="calendar"
          iconColor={accents.valorant}
          label={t("notif.valAlerts")}
          hint={teams.length ? t("notif.valAlertsTeams", { teams: teams.map(tm => tm.acronym || tm.name).join(", ") }) : t("notif.valAlertsHint")}
          disabled={off}
          right={toggle(prefs.valAlerts !== false, v => setPref({ valAlerts: v }))}
        />
        <View style={styles.divider} />
        <SettingRow
          label={t("notif.quiet")}
          hint={t("notif.quietHint")}
          disabled={off}
          right={toggle(prefs.quiet.enabled, v => setPref({ quiet: { enabled: v } }))}
        />
        {prefs.quiet.enabled && !off && (
          <>
            <TimeStepper label={t("notif.from")} value={prefs.quiet.from} onChange={v => setPref({ quiet: { from: v } })} accent={accent} />
            <TimeStepper label={t("notif.to")} value={prefs.quiet.to} onChange={v => setPref({ quiet: { to: v } })} accent={accent} />
          </>
        )}
        <View style={styles.divider} />
        <SettingRow
          label={t("notif.permission")}
          hint={permission === "denied" ? t("notif.permissionDeniedHint") : permission === "undetermined" ? t("notif.permissionAskHint") : undefined}
          onPress={permission === "denied" ? openSystemSettings : permission === "undetermined" ? askPermission : undefined}
          right={
            <View style={styles.status}>
              <View style={[styles.dot, { backgroundColor: permission === "granted" ? colors.win : permission === "denied" ? colors.loss : colors.textFaint }]} />
              <Text style={styles.statusText}>{t(`notif.perm.${permission}`)}</Text>
            </View>
          }
        />
        <View style={styles.divider} />
        <SettingRow
          label={t("notif.demo")}
          hint={t("notif.demoHint")}
          onPress={demo}
          right={<Icon name="eye" size={sizes.item - spacing.xs} color={accent} />}
        />
        <View style={styles.divider} />
        <SettingRow
          label={sending ? t("notif.testSending") : t("notif.test")}
          hint={t("notif.testHint")}
          disabled={sending}
          onPress={test}
          right={<Icon name="send" size={sizes.item - spacing.xs} color={accent} />}
        />
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  unsupported: { ...type.small, color: colors.textMuted },
  divider:     { height: sizes.hairline, backgroundColor: colors.border, marginHorizontal: spacing.lg },
  status:      { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  dot:         { width: sizes.dot + 2, height: sizes.dot + 2, borderRadius: sizes.dot },
  statusText:  { ...type.smallStrong, color: colors.textSecondary },
  chips:       { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
});
