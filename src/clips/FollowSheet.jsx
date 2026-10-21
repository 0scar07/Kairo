import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Image, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import Animated, { FadeInDown, LinearTransition, useReducedMotion } from "react-native-reanimated";
import { Chip, PressableScale, Sheet, showHud } from "../components/ui";
import Icon from "../components/Icon";
import { getGameMeta } from "../games/registry";
import { findChannel, getSuggested, loadFollowing, MAX_FOLLOWING, onFollowingChanged, toggleFollowChannel } from "./api";
import { useT } from "../i18n/I18nProvider";
import { errorMessage, formatCompact } from "../utils/format";
import { select, success, warning } from "../utils/haptics";
import { colors, fontSizes, radii, sizes, spacing, type, withAlpha } from "../theme";

const PINK = "#FF3D6E";   // el color de Clips

function Avatar({ uri, size = sizes.avatarLg }) {
  return uri
    ? <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceHigh }} />
    : <View style={[styles.avatarEmpty, { width: size, height: size, borderRadius: size / 2 }]}><Icon name="play" size={size * 0.4} color={colors.textMuted} /></View>;
}

/** Un canal con su botón Seguir / Siguiendo */
function ChannelRow({ channel, following, onToggle, t, index = 0 }) {
  const reduce = useReducedMotion();
  const meta = getGameMeta(channel.game);
  return (
    <Animated.View entering={reduce ? undefined : FadeInDown.delay(index * 45).duration(300)} layout={reduce ? undefined : LinearTransition.springify().damping(18)} style={styles.row}>
      <Avatar uri={channel.image} />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>{channel.title}</Text>
        <Text style={styles.rowSub} numberOfLines={1}>{[meta?.short, channel.handle, channel.subs != null ? t("clips.subs", { n: formatCompact(channel.subs) }) : null].filter(Boolean).join(" · ")}</Text>
      </View>
      <PressableScale onPress={() => onToggle(channel)} scaleTo={0.9} style={[styles.follow, following && styles.followOn]} accessibilityRole="button" accessibilityState={{ selected: following }}>
        <Text style={[styles.followText, following && styles.followTextOn]}>{following ? t("clips.followingBtn") : t("clips.follow")}</Text>
      </PressableScale>
    </Animated.View>
  );
}

/**
 * Hoja para elegir qué canales seguir en Clips → Siguiendo: sugeridos por juego (pros y streamers) y un campo para
 * pegar cualquier @ o enlace de YouTube. Los canales seguidos se guardan en el celular (clips/api.js).
 */
export default function FollowSheet({ visible, onClose, initialGame }) {
  const t = useT();
  const [following, setFollowing] = useState([]);
  const [suggested, setSuggested] = useState(null);
  const [game, setGame] = useState(initialGame && initialGame !== "all" ? initialGame : "lol");
  const [text, setText] = useState("");
  const [found, setFound] = useState(null);   // { status: "loading" | "ready" | "error", channel?, message? }

  useEffect(() => {
    loadFollowing().then(setFollowing);
    return onFollowingChanged(setFollowing);
  }, []);
  useEffect(() => {
    if (!visible || suggested) return;
    getSuggested().then(setSuggested).catch(() => setSuggested([]));
  }, [visible]);

  const games = useMemo(() => [...new Set((suggested || []).map(c => c.game))], [suggested]);
  const shown = (suggested || []).filter(c => c.game === game);
  const isOn = id => following.some(c => c.id === id);

  async function toggle(channel) {
    select();
    const { following: now, full } = await toggleFollowChannel({ ...channel, game: channel.game || game });
    if (full) { warning(); showHud(t("clips.followFull", { n: MAX_FOLLOWING }), "alert"); return; }
    if (now) { success(); showHud(t("clips.followed", { name: channel.title }), "check"); }
  }

  async function search() {
    const q = text.trim();
    if (!q) return;
    setFound({ status: "loading" });
    try {
      const channel = await findChannel(q);
      setFound({ status: "ready", channel: { ...channel, game } });
    } catch (e) {
      const code = e?.response?.data?.code;
      setFound({ status: "error", message: code === "CHANNEL_NOT_FOUND" || code === "INVALID_CHANNEL" ? t("clips.notFound") : errorMessage(e) });
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={t("clips.followTitle")}>
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>{t("clips.followLead")}</Text>

        <View style={styles.search}>
          <TextInput
            value={text}
            onChangeText={v => { setText(v); if (found) setFound(null); }}
            placeholder={t("clips.pastePlaceholder")}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={search}
            returnKeyType="search"
            accessibilityLabel={t("clips.pastePlaceholder")}
          />
          <PressableScale onPress={search} haptic style={styles.go} accessibilityRole="button" accessibilityLabel={t("clips.find")}>
            {found?.status === "loading" ? <ActivityIndicator size="small" color={colors.onAccent} /> : <Icon name="search" size={fontSizes.lg} color={colors.onAccent} />}
          </PressableScale>
        </View>
        {found?.status === "ready" ? <ChannelRow channel={found.channel} following={isOn(found.channel.id)} onToggle={toggle} t={t} /> : null}
        {found?.status === "error" ? <Text style={styles.error}>{found.message}</Text> : null}

        {games.length ? (
          <>
            <Text style={styles.section}>{t("clips.suggested")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
              {games.map(g => <Chip key={g} label={getGameMeta(g)?.short || g} game={g} active={g === game} onPress={() => setGame(g)} />)}
            </ScrollView>
            {shown.map((c, i) => <ChannelRow key={`${game}-${c.id}`} index={i} channel={c} following={isOn(c.id)} onToggle={toggle} t={t} />)}
          </>
        ) : suggested == null ? <ActivityIndicator color={PINK} style={styles.loading} /> : null}

        {following.length ? (
          <>
            <Text style={styles.section}>{t("clips.yourChannels", { n: following.length, max: MAX_FOLLOWING })}</Text>
            {following.map((c, i) => <ChannelRow key={`me-${c.id}`} index={i} channel={c} following onToggle={toggle} t={t} />)}
          </>
        ) : null}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll:     { maxHeight: 560 },
  lead:       { ...type.small, color: colors.textSecondary, marginBottom: spacing.md },
  search:     { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  input:      { flex: 1, minWidth: 0, height: sizes.button - spacing.sm, borderRadius: radii.md, borderWidth: sizes.hairline, borderColor: colors.border, backgroundColor: colors.bg, color: colors.text, paddingHorizontal: spacing.md, fontFamily: "Inter_500Medium" },
  go:         { width: sizes.button - spacing.sm, height: sizes.button - spacing.sm, borderRadius: radii.md, alignItems: "center", justifyContent: "center", backgroundColor: PINK },
  error:      { ...type.small, color: colors.loss, marginBottom: spacing.sm },
  section:    { ...type.section, color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.sm },
  chips:      { marginBottom: spacing.sm },
  loading:    { marginTop: spacing.lg },
  row:        { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  rowBody:    { flex: 1, minWidth: 0 },
  rowTitle:   { ...type.bodyStrong, color: colors.text },
  rowSub:     { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
  avatarEmpty:{ alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceHigh },
  follow:     { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 1, borderRadius: radii.pill, borderWidth: sizes.hairline * 1.5, borderColor: withAlpha(PINK, 0.8) },
  followOn:   { backgroundColor: PINK, borderColor: PINK },
  followText: { ...type.captionStrong, color: PINK },
  followTextOn: { color: colors.onAccent },
});
