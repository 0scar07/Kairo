import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Alert } from "react-native";
import ProfileView from "../components/ProfileView";
import { RegionChips } from "../components/RegionPicker";
import { getGame } from "../games";
import { DEFAULT_REGION } from "../constants/regions";
import { errorMessage } from "../utils/format";
import { loadMyProfiles, saveMyProfile } from "../utils/prefs";
import { useBootData } from "../boot/BootContext";
import {
  colors, radii, sizes, spacing, type, glow, useActiveGame, useAccent,
} from "../theme";

function SetupModal({ visible, game, initialRegion, onSave, onCancel }) {
  const accent = useAccent(game.id);
  const [name, setName]     = useState("");
  const [tag, setTag]       = useState("");
  const [region, setRegion] = useState(initialRegion);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>{game.icon} Mi perfil de {game.short}</Text>
          <Text style={styles.modalSubtitle}>Ingresa tu Riot ID para configurar tu perfil personal</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nombre (ej: Hide on bush)"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            value={tag}
            onChangeText={setTag}
            placeholder="TAG (ej: KR1)"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <RegionChips value={region} onChange={setRegion} game={game.id} />
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: accent }, glow(accent, spacing.md, 0.4)]}
            onPress={() => {
              if (!name.trim() || !tag.trim()) {
                Alert.alert("Faltan datos", "Ingresa tu nombre y TAG");
                return;
              }
              onSave(name.trim(), tag.trim().replace(/^#/, ""), region);
            }}
          >
            <Text style={styles.btnText}>Guardar perfil</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Perfil propio del juego activo: guarda tu Riot ID por juego y muestra el perfil con extras
export default function MyProfileScreen() {
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
        const data = await game.api.search(mine.gameName, mine.tagLine, mine.region || DEFAULT_REGION);
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
      await saveMyProfile(gameId, { gameName: data.account.gameName, tagLine: data.account.tagLine, region });
      setState({ status: "ready", data });
    } catch (e) {
      Alert.alert("No se pudo cargar el perfil", errorMessage(e));
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
          headerAction={{ icon: "✏️", onPress: () => setShowSetup(true) }}
        />
      </>
    );
  }

  return (
    <View style={styles.center}>
      {setup}
      {state.status === "loading" && <Text style={[styles.message, { color: accent }]}>{game.icon} Cargando perfil...</Text>}
      {state.status === "setup" && (
        <>
          <Text style={styles.message}>{game.icon} Aún no configuras tu perfil de {game.name}</Text>
          <TouchableOpacity style={[styles.btn, styles.centerBtn, { backgroundColor: accent }]} onPress={() => setShowSetup(true)}>
            <Text style={styles.btnText}>Configurar mi perfil</Text>
          </TouchableOpacity>
        </>
      )}
      {state.status === "error" && (
        <>
          <Text style={styles.error}>{state.message}</Text>
          <TouchableOpacity style={[styles.btn, styles.centerBtn, { backgroundColor: accent }]} onPress={() => setReload(n => n + 1)}>
            <Text style={styles.btnText}>Reintentar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowSetup(true)}>
            <Text style={styles.cancelText}>Cambiar de cuenta</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center:        { flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center", padding: spacing.xl },
  message:       { ...type.heading, color: colors.text, textAlign: "center", marginBottom: spacing.lg },
  error:         { ...type.body, color: colors.loss, textAlign: "center", marginBottom: spacing.lg },
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
