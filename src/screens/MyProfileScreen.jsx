import React, { useEffect, useState } from "react";
import { useT } from "../i18n/I18nProvider";
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Alert } from "react-native";
import ProfileView from "../components/ProfileView";
import Icon from "../components/Icon";
import ProfileSkeleton from "../components/ProfileSkeleton";
import { ErrorState } from "../components/ui";
import { RegionChips } from "../components/RegionPicker";
import { getGame } from "../games";
import { DEFAULT_REGION } from "../constants/regions";
import { errorMessage } from "../utils/format";
import { GLOBAL_REGION } from "../utils/supercell";
import { loadMyProfiles, saveMyProfile } from "../utils/prefs";
import { useBootData } from "../boot/BootContext";
import {
  colors, radii, sizes, spacing, type, glow, useActiveGame, useAccent,
} from "../theme";

function SetupModal({ visible, game, initialRegion, onSave, onCancel }) {
  const t = useT();
  const accent = useAccent(game.id);
  const [name, setName]     = useState("");
  const [tag, setTag]       = useState("");
  const [region, setRegion] = useState(initialRegion);
  const tagOnly = Boolean(game.tagSearch);   // Supercell: solo el tag, sin nombre ni región
  const byName = game.search === "name";      // Dota 2, Fortnite, Apex, PUBG: un nombre (o ID) y una plataforma opcional
  const [platform, setPlatform] = useState(game.platforms?.[0]?.id);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>{t("settings.myProfile", { game: game.short })}</Text>
          <Text style={styles.modalSubtitle}>{byName ? t(game.searchResults ? "myProfile.subtitleId" : "myProfile.subtitleName") : tagOnly ? t("myProfile.subtitleTag") : t("myProfile.subtitleRiot")}</Text>
          {!tagOnly && !byName && <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t("myProfile.namePlaceholder")}
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />}
          <TextInput
            value={tag}
            onChangeText={setTag}
            placeholder={byName ? t(game.searchResults ? "myProfile.idPlaceholder" : "myProfile.nameOnlyPlaceholder") : tagOnly ? t("myProfile.tagOnlyPlaceholder") : t("myProfile.tagPlaceholder")}
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {!tagOnly && !byName && <RegionChips value={region} onChange={setRegion} game={game.id} />}
          {byName && game.platforms && <RegionChips value={platform} onChange={setPlatform} game={game.id} options={game.platforms} />}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: accent }, glow(accent, spacing.md, 0.4)]}
            onPress={() => {
              if (byName) {
                if (!tag.trim()) { Alert.alert(t("myProfile.missingTitle"), t("myProfile.missingName")); return; }
                onSave(tag.trim(), "", platform || GLOBAL_REGION);
                return;
              }
              if ((!tagOnly && !name.trim()) || !tag.trim()) {
                Alert.alert(t("myProfile.missingTitle"), tagOnly ? t("myProfile.missingTag") : t("myProfile.missingNameTag"));
                return;
              }
              onSave(name.trim(), tag.trim().replace(/^#/, ""), tagOnly ? GLOBAL_REGION : region);
            }}
          >
            <Text style={styles.btnText}>{t("myProfile.save")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>{t("common.cancel")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Perfil propio del juego activo: guarda tu Riot ID por juego y muestra el perfil con extras
export default function MyProfileScreen() {
  const t = useT();
  const { gameId } = useActiveGame();
  const game = getGame(gameId);
  const accent = useAccent(gameId);
  const { region: defaultRegion } = useBootData();
  const [state, setState] = useState({ status: "loading" });   // loading | setup | ready | error
  const [showSetup, setShowSetup] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState({ status: "loading" });
      try {
        const mine = (await loadMyProfiles())[gameId];
        if (!mine) { if (!cancelled) setState({ status: "setup" }); return; }
        const data = await game.api.search(mine.lookup ?? mine.gameName, mine.tagLine ?? "", mine.region || DEFAULT_REGION);
        if (!cancelled) setState({ status: "ready", data });
      } catch (e) {
        if (!cancelled) setState({ status: "error", message: errorMessage(e) });
      }
    })();
    return () => { cancelled = true; };
  }, [gameId, reload]);

  async function save(name, tag, region) {
    setShowSetup(false);
    setState({ status: "loading" });
    try {
      // Se comprueba que el jugador exista antes de guardarlo
      const data = await game.api.search(name, tag, region);
      await saveMyProfile(gameId, { gameName: data.account.gameName, tagLine: data.account.tagLine, lookup: data.account.lookup, region });
      setState({ status: "ready", data });
    } catch (e) {
      Alert.alert(t("profile.loadError"), errorMessage(e));
      setState({ status: "setup" });
    }
  }

  const setup = (
    <SetupModal
      key={gameId}
      visible={showSetup}
      game={game}
      initialRegion={defaultRegion}
      onSave={save}
      onCancel={() => setShowSetup(false)}
    />
  );

  if (state.status === "ready") {
    return (
      <>
        {setup}
        <ProfileView
          key={`${gameId}-${state.data.account.puuid}`}
          gameId={gameId}
          initialData={state.data}
          mine
          headerAction={{ icon: <Icon name="edit" size={sizes.avatarXs} color={colors.textMuted} />, onPress: () => setShowSetup(true) }}
        />
      </>
    );
  }

  if (state.status === "loading") return <ProfileSkeleton />;

  return (
    <View style={styles.center}>
      {setup}
      {state.status === "setup" && (
        <>
          <Text style={styles.message}>{t("myProfile.notSet", { game: game.name })}</Text>
          <TouchableOpacity style={[styles.btn, styles.centerBtn, { backgroundColor: accent }]} onPress={() => setShowSetup(true)}>
            <Text style={styles.btnText}>{t("myProfile.setup")}</Text>
          </TouchableOpacity>
        </>
      )}
      {state.status === "error" && (
        <>
          <ErrorState message={state.message} onRetry={() => setReload(n => n + 1)} />
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowSetup(true)}>
            <Text style={styles.cancelText}>{t("myProfile.change")}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center:        { flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center", padding: spacing.xl },
  message:       { ...type.heading, color: colors.text, textAlign: "center", marginBottom: spacing.lg },
  overlay:       { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", alignItems: "center", padding: spacing.xl },
  modal:         {
    backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.xl,
    width: "100%", borderWidth: sizes.hairline, borderColor: colors.border,
  },
  modalTitle:    { ...type.title, color: colors.text, marginBottom: spacing.sm },
  modalSubtitle: { ...type.body, color: colors.textMuted, marginBottom: spacing.xl },
  input:         {
    ...type.body, backgroundColor: colors.bg, borderWidth: sizes.hairline, borderColor: colors.border,
    borderRadius: radii.md, padding: spacing.lg, color: colors.text, marginBottom: spacing.md,
  },
  btn:           { borderRadius: radii.md, padding: spacing.lg, alignItems: "center", marginTop: spacing.xs },
  centerBtn:     { alignSelf: "stretch" },
  btnText:       { ...type.heading, color: colors.onAccent },
  cancelBtn:     { marginTop: spacing.md, padding: spacing.lg, alignItems: "center" },
  cancelText:    { ...type.body, color: colors.textMuted },
});
