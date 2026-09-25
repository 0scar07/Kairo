import React from "react";
import { View, Text, ScrollView, Switch, StyleSheet, Alert } from "react-native";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { Card, SectionLabel, SettingRow, Chip } from "../components/ui";
import NotificationsSection from "../notifications/NotificationsSection";
import { RegionChips } from "../components/RegionPicker";
import Reveal from "../components/Reveal";
import Icon from "../components/Icon";
import { getGame } from "../games";
import { APP_NAME } from "../constants/config";
import { LANGUAGES, AUTO } from "../i18n";
import { useI18n } from "../i18n/I18nProvider";
import { errorMessage } from "../utils/format";
import { clearRecents } from "../utils/recents";
import { select } from "../utils/haptics";
import { useBootData } from "../boot/BootContext";
import { colors, sizes, spacing, fontSizes, lineHeights, type, useActiveGame, withAlpha } from "../theme";

// Ajustes: mi perfil, región por defecto, vibración, búsquedas recientes y acerca de
export default function SettingsScreen({ navigation }) {
  const { t, preference, setPreference } = useI18n();
  const { gameId, accent } = useActiveGame();
  const game = getGame(gameId);
  const { region, setRegion, haptics, setHaptics } = useBootData();
  const version = Constants.expoConfig?.version || "1.0.0";

  function confirmClearRecents() {
    Alert.alert(t("settings.clearRecents"), t("settings.clearRecentsBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"), style: "destructive",
        onPress: () => clearRecents().catch(e => Alert.alert(t("common.error"), errorMessage(e))),
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Reveal order={0}>
        <Text style={styles.title}>{t("settings.title").toUpperCase()}</Text>
      </Reveal>

      <Reveal order={1}>
        <SectionLabel>{t("settings.account")}</SectionLabel>
        <Card padded={false}>
          <SettingRow
            label={t("settings.myProfile", { game: game.short })}
            hint={game.tagSearch ? t("settings.myProfileHintTag") : t("settings.myProfileHintRiot")}
            onPress={() => navigation.navigate("MyProfile")}
            right={<Icon name="chevron" size={sizes.item - spacing.xs} color={colors.textMuted} />}
          />
        </Card>
      </Reveal>

      <Reveal order={2}>
        <SectionLabel>{t("settings.search")}</SectionLabel>
        <Card>
          <Text style={styles.rowLabel}>{t("settings.defaultRegion")}</Text>
          <Text style={[styles.rowHint, styles.regionHint]}>{t("settings.defaultRegionHint")}</Text>
          <RegionChips value={region} onChange={setRegion} />
        </Card>
      </Reveal>

      <Reveal order={3}>
        <SectionLabel>{t("settings.language")}</SectionLabel>
        <Card>
          <Text style={styles.rowHint}>{t("settings.languageHint")}</Text>
          <View style={styles.languages}>
            <Chip label={t("settings.languageAuto")} active={preference === AUTO} onPress={() => setPreference(AUTO)} />
            {LANGUAGES.map(l => (
              <Chip key={l.id} label={l.label} active={preference === l.id} onPress={() => setPreference(l.id)} />
            ))}
          </View>
        </Card>
      </Reveal>

      <Reveal order={4}>
        <NotificationsSection />
      </Reveal>

      <Reveal order={5}>
        <SectionLabel>{t("settings.preferences")}</SectionLabel>
        <Card padded={false}>
          <SettingRow
            label={t("settings.haptics")}
            hint={t("settings.hapticsHint")}
            right={
              <Switch
                value={haptics}
                onValueChange={v => { setHaptics(v); if (v) select(); }}
                trackColor={{ false: colors.surfaceHigh, true: withAlpha(accent, 0.5) }}
                thumbColor={haptics ? accent : colors.textMuted}
              />
            }
          />
          <View style={styles.divider} />
          <SettingRow label={t("settings.clearRecents")} danger onPress={confirmClearRecents} />
        </Card>
      </Reveal>

      <Reveal order={6}>
        <SectionLabel>{t("settings.about")}</SectionLabel>
        <Card>
          <Text style={styles.about}>{t("settings.version", { app: APP_NAME, version })}</Text>
          <Text style={styles.rowHint}>{t("app.tagline")}</Text>
          {Updates.updateId ? <Text style={styles.rowHint}>{t("settings.update", { id: Updates.updateId.slice(0, 8) })}</Text> : null}
          <Text style={styles.legal}>{t("legal.riot", { app: APP_NAME })}</Text>
          <Text style={styles.legal}>{t("legal.supercell")}</Text>
          <Text style={styles.legal}>{t("legal.games")}</Text>
        </Card>
      </Reveal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  languages: { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.sm, marginTop: spacing.md },
  container:  { flex: 1, backgroundColor: colors.bg },
  content:    { padding: spacing.xl, paddingTop: spacing.hero, paddingBottom: sizes.tabBarSpace },
  title:      { ...type.brand, fontSize: fontSizes.xxl, color: colors.text, marginBottom: spacing.xl },
  rowLabel:   { ...type.bodyStrong, fontSize: fontSizes.base, color: colors.text },
  rowHint:    { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
  regionHint: { marginBottom: spacing.md },
  divider:    { height: sizes.hairline, backgroundColor: colors.border, marginHorizontal: spacing.lg },
  about:      { ...type.bodyStrong, fontSize: fontSizes.base, color: colors.text },
  legal:      { ...type.micro, color: colors.textFaint, marginTop: spacing.md, lineHeight: lineHeights.small },
});
