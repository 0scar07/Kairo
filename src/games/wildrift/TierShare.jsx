import React, { useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Platform, StyleSheet, Text, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { PressableScale } from "../../components/ui";
import Icon from "../../components/Icon";
import { champIcon } from "./api";
import { useT } from "../../i18n/I18nProvider";
import { errorMessage } from "../../utils/format";
import { CARD_H, CARD_W } from "../../share/ShareCard";
import { accents, colors, fonts, radii, sizes, spacing, tracking } from "../../theme";

const ACCENT = accents.wildrift;
const SETTLE_MS = 900;   // los retratos vienen de internet: se espera a que se pinten antes de capturar
const SHOWN = ["S+", "S", "A"];
const PER_ROW = 7;
const PORTRAIT = 36;

/** Tarjeta 4:5 con los tiers S+, S y A de un carril y rango, para compartir como imagen */
function TierCard({ list, title, subtitle, footer }) {
  return (
    <View style={styles.card} collapsable={false}>
      <Svg width={CARD_W} height={CARD_H} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="wrGlow" cx="50%" cy="20%" r="70%">
            <Stop offset="0" stopColor={ACCENT} stopOpacity="0.3" />
            <Stop offset="1" stopColor={colors.bg} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width={CARD_W} height={CARD_H} fill={colors.bg} />
        <Rect width={CARD_W} height={CARD_H} fill="url(#wrGlow)" />
      </Svg>
      <Text style={[styles.brand, { color: accents.brand }]}>KAIRO</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <View style={styles.rows}>
        {SHOWN.map(tier => {
          const champs = list.filter(c => c.tier === tier).slice(0, PER_ROW);
          if (!champs.length) return null;
          return (
            <View key={tier} style={styles.row}>
              <View style={[styles.tier, { backgroundColor: colors.wrTier[tier] }]}><Text style={styles.tierText}>{tier}</Text></View>
              <View style={styles.ports}>
                {champs.map(c => <Image key={c.heroId} source={{ uri: champIcon(c) }} style={styles.port} />)}
              </View>
            </View>
          );
        })}
      </View>
      <Text style={styles.footer}>{footer}</Text>
    </View>
  );
}

/**
 * Botón de compartir la tier list como imagen (1080 x 1350). Monta la tarjeta fuera de pantalla solo mientras se
 * captura, como el de los perfiles. En la web no aparece.
 */
export default function TierShareButton({ list, title, subtitle, footer }) {
  const t = useT();
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  if (Platform.OS === "web" || !list?.length) return null;

  async function share() {
    if (busy) return;
    setBusy(true);
    try {
      if (!(await Sharing.isAvailableAsync())) throw new Error(t("share.unavailable"));
      await new Promise(r => setTimeout(r, SETTLE_MS));
      const uri = await captureRef(ref, { format: "png", quality: 1, result: "tmpfile", width: CARD_W * 3, height: CARD_H * 3 });
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: t("share.title") });
    } catch (e) {
      Alert.alert(t("common.error"), t("share.error", { error: errorMessage(e) }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PressableScale haptic scaleTo={0.85} onPress={share} hitSlop={spacing.sm} disabled={busy} style={styles.button} accessibilityRole="button" accessibilityLabel={t("share.button")}>
        {busy ? <ActivityIndicator size="small" color={ACCENT} /> : <Icon name="share" size={sizes.item - spacing.xs} color={colors.textMuted} />}
      </PressableScale>
      {busy ? (
        <View pointerEvents="none" style={styles.offscreen}>
          <View ref={ref} collapsable={false}>
            <TierCard list={list} title={title} subtitle={subtitle} footer={footer} />
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  button:    { padding: spacing.xs + spacing.xxs, marginRight: spacing.sm, borderRadius: radii.pill },
  offscreen: { position: "absolute", left: -CARD_W - 40, top: 0, width: CARD_W, height: CARD_H },
  card:      { width: CARD_W, height: CARD_H, padding: spacing.xl, overflow: "hidden" },
  brand:     { fontFamily: fonts.displayHeavy, fontSize: 20, letterSpacing: tracking.brand },
  title:     { fontFamily: fonts.display, fontSize: 26, color: colors.text, marginTop: spacing.md },
  subtitle:  { fontFamily: fonts.bodyBold, fontSize: 13, color: ACCENT, letterSpacing: 1, marginTop: spacing.xxs },
  rows:      { flex: 1, justifyContent: "center", gap: spacing.sm },
  row:       { flexDirection: "row", gap: spacing.sm, alignItems: "stretch" },
  tier:      { width: 44, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  tierText:  { fontFamily: fonts.display, fontSize: 18, color: colors.onAccent },
  ports:     { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 4, padding: 6, borderRadius: radii.md, backgroundColor: colors.surface },
  port:      { width: PORTRAIT, height: PORTRAIT, borderRadius: radii.sm },
  footer:    { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
});
