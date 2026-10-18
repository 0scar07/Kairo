import React, { useCallback, useState } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Card, SectionLabel, PressableScale } from "./ui";
import Icon from "./Icon";
import { loadFollowedPros } from "../utils/followedPros";
import { useT } from "../i18n/I18nProvider";
import { colors, fontSizes, radii, sizes, spacing, type } from "../theme";

/**
 * Pros que sigues, en Favoritos: foto, nombre con su equipo y acceso a su pantalla (con la próxima partida y los
 * avisos). Si no sigues a ninguno no se muestra nada.
 */
export default function FollowedPros({ navigation }) {
  const t = useT();
  const [list, setList] = useState([]);

  useFocusEffect(useCallback(() => { loadFollowedPros().then(setList).catch(() => {}); }, []));

  if (!list.length) return null;
  return (
    <View style={styles.wrap}>
      <SectionLabel icon="crown" style={styles.label}>{t("favorites.pros")}</SectionLabel>
      <Card style={styles.card}>
        {list.map((p, i) => (
          <PressableScale
            key={p.playerId}
            onPress={() => navigation.navigate("ProPlayer", { slug: p.slug, playerId: p.playerId, leagueSlug: p.leagueSlug })}
            style={[styles.row, i > 0 && styles.divider]}
            accessibilityRole="button"
            accessibilityLabel={`${p.teamCode || ""} ${p.name}`.trim()}
          >
            {p.image || p.teamImage
              ? <Image source={{ uri: p.image || p.teamImage }} style={styles.photo} resizeMode="cover" />
              : <View style={styles.photo} />}
            <View style={styles.text}>
              <Text style={styles.name} numberOfLines={1}>{p.teamCode ? `${p.teamCode} ${p.name}` : p.name}</Text>
              <Text style={styles.sub} numberOfLines={1}>{p.teamName}{p.alerts !== false ? ` · ${t("proFollow.alertsShort")}` : ""}</Text>
            </View>
            <Icon name="chevron" size={fontSizes.base} color={colors.textMuted} />
          </PressableScale>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:    { marginBottom: spacing.xl },
  label:   { marginBottom: spacing.sm },
  card:    { paddingVertical: spacing.xs, paddingHorizontal: 0 },
  row:     { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.md, minHeight: sizes.placement + spacing.md },
  divider: { borderTopWidth: sizes.hairline, borderTopColor: colors.border },
  photo:   { width: sizes.avatarLg, height: sizes.avatarLg, borderRadius: radii.pill, backgroundColor: colors.surfaceHigh },
  text:    { flex: 1 },
  name:    { ...type.bodyStrong, color: colors.text },
  sub:     { ...type.small, color: colors.textMuted, marginTop: spacing.xxs },
});
