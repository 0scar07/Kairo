import React, { useEffect, useState } from "react";
import { useT } from "../../../i18n/I18nProvider";
import { View, Text, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { PressableScale } from "../../../components/ui";
import Icon from "../../../components/Icon";
import { getLive } from "../api";
import { queueLabel } from "../utils";
import { colors, radii, sizes, spacing, type, withAlpha } from "../../../theme";

const RECHECK_MS = 60_000;

// Aviso "En partida ahora" en el perfil: solo aparece si el jugador está jugando y abre la partida en vivo.
// Es opcional: si la consulta falla (por ejemplo, la key no tiene esa API) simplemente no se muestra.
export default function LiveBanner({ puuid, region }) {
  const t = useT();
  const navigation = useNavigation();
  const [live, setLive] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const check = () => getLive(puuid, region)
      .then(data => { if (!cancelled) setLive(data.inGame ? data : null); })
      .catch(e => { if (!cancelled) { setLive(null); console.warn("Partida en vivo no disponible:", e.message); } });
    check();
    const timer = setInterval(check, RECHECK_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [puuid, region]);

  if (!live) return null;
  return (
    <PressableScale
      haptic
      scaleTo={0.985}
      onPress={() => navigation.navigate("LiveGame", { puuid, region })}
      style={styles.banner}
      accessibilityLabel={t("live.view")}
    >
      <View style={styles.dot} />
      <View style={styles.info}>
        <Text style={styles.title}>{t("live.inGame")}</Text>
        <Text style={styles.sub}>{t("live.bannerHint", { mode: queueLabel(live.queueId) })}</Text>
      </View>
      <Icon name="chevron" size={sizes.item - spacing.xs} color={colors.loss} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, marginBottom: spacing.lg,
    borderWidth: sizes.hairline, borderColor: colors.loss, borderRadius: radii.lg, backgroundColor: withAlpha(colors.loss, 0.1),
  },
  dot:   { width: sizes.dot + spacing.xs, height: sizes.dot + spacing.xs, borderRadius: radii.pill, backgroundColor: colors.loss },
  info:  { flex: 1 },
  title: { ...type.label, color: colors.loss },
  sub:   { ...type.caption, color: colors.textSecondary },
});
