import React, { useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform, StyleSheet, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { PressableScale } from "../components/ui";
import Icon from "../components/Icon";
import ShareCard, { CARD_H, CARD_W } from "./ShareCard";
import { useT } from "../i18n/I18nProvider";
import { errorMessage } from "../utils/format";
import { colors, radii, sizes, spacing } from "../theme";

const SETTLE_MS = 700;   // deja que las imágenes de la tarjeta (avatar, emblema) terminen de pintarse antes de capturar

/**
 * Botón de compartir el perfil como imagen. Monta la tarjeta fuera de pantalla solo mientras se captura, la guarda como
 * PNG (1080 x 1350) y abre el menú de compartir del sistema. En la web no aparece (no hay menú de compartir de archivos).
 */
export default function ShareButton({ gameId, data, accent }) {
  const t = useT();
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  if (Platform.OS === "web") return null;

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
      <PressableScale
        haptic
        scaleTo={0.85}
        onPress={share}
        hitSlop={spacing.sm}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={t("share.button")}
        style={styles.button}
      >
        {busy ? <ActivityIndicator size="small" color={accent} /> : <Icon name="share" size={sizes.item - spacing.xs} color={colors.textMuted} />}
      </PressableScale>
      {busy ? (
        <View pointerEvents="none" style={styles.offscreen}>
          <View ref={ref} collapsable={false}>
            <ShareCard gameId={gameId} data={data} />
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  button:    { padding: spacing.xs + spacing.xxs, borderRadius: radii.pill },
  offscreen: { position: "absolute", left: -CARD_W - 40, top: 0, width: CARD_W, height: CARD_H },
});
