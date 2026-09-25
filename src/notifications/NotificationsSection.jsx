import React, { useState } from "react";
import { View, Text, Switch, StyleSheet, Alert } from "react-native";
import { Card, SectionLabel, SettingRow } from "../components/ui";
import Icon from "../components/Icon";
import TimeStepper from "./TimeStepper";
import { useNotifications } from "./NotificationsProvider";
import { useT } from "../i18n/I18nProvider";
import { errorMessage } from "../utils/format";
import { emitLive } from "./events";
import { accents, colors, sizes, spacing, type, withAlpha } from "../theme";

// Ajustes > Notificaciones: interruptor general, qué avisar, horario silencioso, estado del permiso y una prueba
export default function NotificationsSection() {
  const t = useT();
  const { supported, permission, prefs, setPref, openSystemSettings, sendTest } = useNotifications();
  const [sending, setSending] = useState(false);
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
        <SettingRow label={t("notif.enable")} hint={t("notif.enableHint")} right={toggle(prefs.enabled, v => setPref({ enabled: v }))} />
        <View style={styles.divider} />
        <SettingRow label={t("notif.start")} disabled={off} right={toggle(prefs.notifyStart, v => setPref({ notifyStart: v }))} />
        <View style={styles.divider} />
        <SettingRow label={t("notif.end")} disabled={off} right={toggle(prefs.notifyEnd, v => setPref({ notifyEnd: v }))} />
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
          hint={permission === "denied" ? t("notif.permissionDeniedHint") : undefined}
          onPress={permission === "denied" ? openSystemSettings : undefined}
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
});
