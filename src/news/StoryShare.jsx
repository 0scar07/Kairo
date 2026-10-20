import React, { useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Platform, StyleSheet, Text, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import Svg, { Defs, RadialGradient, Rect, Stop, Text as SvgText } from "react-native-svg";
import { PressableScale } from "../components/ui";
import Icon from "../components/Icon";
import { posterOf } from "./api";
import { useT } from "../i18n/I18nProvider";
import { errorMessage } from "../utils/format";
import { accents, colors, fonts, radii, sizes, spacing, tracking } from "../theme";

const W = 360;
const H = 640;            // 9:16, como una historia de Instagram; se captura a 3x (1080 x 1920)
const SETTLE_MS = 900;    // los retratos vienen de internet: se espera a que se pinten

/** Historia vertical con el Top 5 del parche */
function StoryCard({ title, entries, footer, accent }) {
  return (
    <View style={styles.card} collapsable={false}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="storyGlow" cx="50%" cy="18%" r="75%">
            <Stop offset="0" stopColor={accent} stopOpacity="0.35" />
            <Stop offset="1" stopColor={colors.bg} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width={W} height={H} fill={colors.bg} />
        <Rect width={W} height={H} fill="url(#storyGlow)" />
      </Svg>
      <Text style={[styles.brand, { color: accents.brand }]}>KAIRO</Text>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.list}>
        {entries.map((e, i) => (
          <View key={e.name} style={styles.row}>
            <Svg width={58} height={92}>
              <SvgText x="0" y="84" fontSize="92" fontFamily="Sora_800ExtraBold" fill={colors.bg} stroke="#F3D58A" strokeWidth="2">{String(i + 1)}</SvgText>
            </Svg>
            {posterOf(e) ? <Image source={{ uri: posterOf(e) }} style={styles.poster} /> : <View style={styles.poster} />}
            <View style={styles.rowBody}>
              <Text style={styles.name} numberOfLines={1}>{e.name}</Text>
              <Text style={[styles.dir, { color: e.dir > 0 ? colors.win : e.dir < 0 ? colors.loss : colors.textMuted }]}>{e.dir > 0 ? "▲" : e.dir < 0 ? "▼" : "•"}</Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.footer}>{footer}</Text>
    </View>
  );
}

/** Botón de compartir el Top 5 como historia (imagen 1080 x 1920). En la web no aparece. */
export default function StoryShareButton({ title, entries, footer, accent = accents.lol }) {
  const t = useT();
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  if (Platform.OS === "web" || !entries?.length) return null;

  async function share() {
    if (busy) return;
    setBusy(true);
    try {
      if (!(await Sharing.isAvailableAsync())) throw new Error(t("share.unavailable"));
      await new Promise(r => setTimeout(r, SETTLE_MS));
      const uri = await captureRef(ref, { format: "png", quality: 1, result: "tmpfile", width: W * 3, height: H * 3 });
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: t("share.title") });
    } catch (e) {
      Alert.alert(t("common.error"), t("share.error", { error: errorMessage(e) }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PressableScale onPress={share} haptic scaleTo={0.96} disabled={busy} style={styles.button} accessibilityRole="button" accessibilityLabel={t("news.shareStory")}>
        {busy ? <ActivityIndicator size="small" color={colors.bg} /> : <Icon name="share" size={sizes.item - spacing.sm} color={colors.bg} />}
        <Text style={styles.buttonText}>{t("news.shareStory")}</Text>
      </PressableScale>
      {busy ? (
        <View pointerEvents="none" style={styles.offscreen}>
          <View ref={ref} collapsable={false}><StoryCard title={title} entries={entries} footer={footer} accent={accent} /></View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  button:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, height: sizes.avatarLg + spacing.xs, borderRadius: radii.pill, backgroundColor: colors.text, marginTop: spacing.md },
  buttonText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.bg },
  offscreen:  { position: "absolute", left: -W - 40, top: 0, width: W, height: H },
  card:       { width: W, height: H, padding: spacing.xl, overflow: "hidden" },
  brand:      { fontFamily: fonts.displayHeavy, fontSize: 20, letterSpacing: tracking.brand },
  title:      { fontFamily: fonts.displayHeavy, fontSize: 28, lineHeight: 32, color: colors.text, marginTop: spacing.md },
  list:       { flex: 1, justifyContent: "center", gap: spacing.md },
  row:        { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  poster:     { width: 58, height: 84, borderRadius: radii.md, backgroundColor: colors.surface },
  rowBody:    { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name:       { fontFamily: fonts.displaySemi, fontSize: 18, color: colors.text, flexShrink: 1 },
  dir:        { fontFamily: fonts.displayHeavy, fontSize: 18 },
  footer:     { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textMuted },
});
