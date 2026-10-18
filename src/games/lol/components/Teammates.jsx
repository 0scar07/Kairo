import React from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useT } from "../../../i18n/I18nProvider";
import { SectionLabel } from "../../../components/ui";
import Icon from "../../../components/Icon";
import { championIcon, championLabel, profileIconUrl } from "../../../api/ddragon";
import { winrate } from "../../../utils/format";
import { colors, radii, sizes, spacing, fontSizes, type, winrateColor, useAccent } from "../../../theme";

// "Jugó con": compañeros de equipo que repiten en sus últimas partidas, con el resultado juntos. Tocar uno abre su perfil.
export default function Teammates({ mates, games, region }) {
  const t = useT();
  const navigation = useNavigation();
  const accent = useAccent("lol");
  if (!mates.length) return null;
  return (
    <View style={styles.wrap}>
      <SectionLabel style={styles.label}>{t("lol.playedWith")}</SectionLabel>
      <Text style={styles.sub}>{t("lol.playedWithSub", { count: games })}</Text>
      <View style={styles.list}>
        {mates.map((m, i) => {
          const wr = winrate(m.wins, m.games - m.wins);
          return (
            <Pressable
              key={m.puuid}
              onPress={() => navigation.push("Profile", { gameId: "lol", gameName: m.gameName, tagLine: m.tagLine, region })}
              style={({ pressed }) => [styles.row, i > 0 && styles.divider, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`${m.gameName} #${m.tagLine}, ${t("lol.playedTogether", { count: m.games })}, ${m.wins}V ${m.games - m.wins}D`}
            >
              {m.iconId != null ? <Image source={{ uri: profileIconUrl(m.iconId) }} style={styles.avatar} /> : <View style={styles.avatar} />}
              <View style={styles.mid}>
                <Text style={styles.name} numberOfLines={1}>{m.gameName}<Text style={styles.tag}> #{m.tagLine}</Text></Text>
                <View style={styles.champs}>
                  {m.champions.slice(0, 3).map(c => <Image key={c} source={{ uri: championIcon(c) }} style={styles.champ} />)}
                  <Text style={styles.champText} numberOfLines={1}>{m.champions.slice(0, 3).map(championLabel).join(", ")}</Text>
                </View>
              </View>
              <View style={styles.end}>
                <Text style={[styles.record, { color: winrateColor(wr, accent) }]}>{m.wins}V {m.games - m.wins}D</Text>
                <Text style={styles.together}>{t("lol.playedTogether", { count: m.games })}</Text>
              </View>
              <Icon name="chevron" size={fontSizes.lg} color={colors.textMuted} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:      { marginTop: spacing.lg, marginBottom: spacing.sm },
  label:     { marginBottom: 0 },
  sub:       { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs, marginBottom: spacing.sm },
  list:      { borderRadius: radii.lg, overflow: "hidden", borderWidth: sizes.hairline, borderColor: colors.border, backgroundColor: colors.surface },
  row:       { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + spacing.xxs, minHeight: sizes.button + spacing.md },
  divider:   { borderTopWidth: sizes.hairline, borderTopColor: colors.border },
  pressed:   { backgroundColor: colors.surfaceRaised },
  avatar:    { width: sizes.avatarLg, height: sizes.avatarLg, borderRadius: radii.pill, borderWidth: sizes.borderThick, borderColor: colors.borderStrong, backgroundColor: colors.surfaceHigh },
  mid:       { flex: 1, minWidth: 0 },
  name:      { ...type.bodyStrong, fontSize: fontSizes.base, color: colors.text },
  tag:       { ...type.body, color: colors.textMuted },
  champs:    { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.xxs },
  champ:     { width: sizes.avatarXs - spacing.xxs, height: sizes.avatarXs - spacing.xxs, borderRadius: radii.xs },
  champText: { ...type.caption, color: colors.textMuted, flexShrink: 1 },
  end:       { alignItems: "flex-end" },
  record:    { ...type.stat, fontSize: fontSizes.base, fontVariant: ["tabular-nums"] },
  together:  { ...type.caption, color: colors.textMuted },
});
