import React from "react";
import { View, Text, ScrollView, Switch, StyleSheet, Alert } from "react-native";
import Constants from "expo-constants";
import { Card, SectionLabel, PressableScale } from "../components/ui";
import { RegionChips } from "../components/RegionPicker";
import Reveal from "../components/Reveal";
import Icon from "../components/Icon";
import { getGame } from "../games";
import { APP_NAME, APP_TAGLINE } from "../constants/config";
import { errorMessage } from "../utils/format";
import { clearRecents } from "../utils/recents";
import { select } from "../utils/haptics";
import { useBootData } from "../boot/BootContext";
import { colors, sizes, spacing, fontSizes, lineHeights, type, useActiveGame, withAlpha } from "../theme";

function Row({ label, hint, right, onPress, danger }) {
  const body = (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && { color: colors.loss }]}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      {right}
    </View>
  );
  return onPress ? <PressableScale scaleTo={0.985} onPress={onPress}>{body}</PressableScale> : body;
}

// Ajustes: mi perfil, región por defecto, vibración, búsquedas recientes y acerca de
export default function SettingsScreen({ navigation }) {
  const { gameId, accent } = useActiveGame();
  const game = getGame(gameId);
  const { region, setRegion, haptics, setHaptics } = useBootData();
  const version = Constants.expoConfig?.version || "1.0.0";

  function confirmClearRecents() {
    Alert.alert("Borrar búsquedas recientes", "Se quitarán de la pantalla de inicio. Tus favoritos no cambian.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar", style: "destructive",
        onPress: () => clearRecents().catch(e => Alert.alert("Error", errorMessage(e))),
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Reveal order={0}>
        <Text style={styles.title}>AJUSTES</Text>
      </Reveal>

      <Reveal order={1}>
        <SectionLabel>Cuenta</SectionLabel>
        <Card padded={false}>
          <Row
            label={`Mi perfil de ${game.short}`}
            hint={game.tagSearch ? "Tu tag, con tus estadísticas" : "Tu Riot ID, con estadísticas e insignias"}
            onPress={() => navigation.navigate("MyProfile")}
            right={<Icon name="chevron" size={sizes.item - spacing.xs} color={colors.textMuted} />}
          />
        </Card>
      </Reveal>

      <Reveal order={2}>
        <SectionLabel>Búsqueda</SectionLabel>
        <Card>
          <Text style={styles.rowLabel}>Región por defecto</Text>
          <Text style={[styles.rowHint, styles.regionHint]}>Se usa al buscar jugadores</Text>
          <RegionChips value={region} onChange={setRegion} />
        </Card>
      </Reveal>

      <Reveal order={3}>
        <SectionLabel>Preferencias</SectionLabel>
        <Card padded={false}>
          <Row
            label="Vibración"
            hint="Respuesta háptica al tocar"
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
          <Row label="Borrar búsquedas recientes" danger onPress={confirmClearRecents} />
        </Card>
      </Reveal>

      <Reveal order={4}>
        <SectionLabel>Acerca de</SectionLabel>
        <Card>
          <Text style={styles.about}>{APP_NAME} · versión {version}</Text>
          <Text style={styles.rowHint}>{APP_TAGLINE}</Text>
          <Text style={styles.legal}>
            {APP_NAME} no está respaldada por Riot Games ni refleja las opiniones de Riot Games ni de nadie
            involucrado oficialmente en la producción o gestión de sus propiedades. Riot Games y todas las
            propiedades asociadas son marcas comerciales o marcas registradas de Riot Games, Inc.
          </Text>
          <Text style={styles.legal}>
            Este contenido no está afiliado, respaldado, patrocinado ni aprobado específicamente por Supercell y
            Supercell no se hace responsable de él. Más información: la política de contenido de fans de Supercell
            (supercell.com/fan-content-policy). Brawl Stars, Clash Royale y Clash of Clans son marcas de Supercell.
          </Text>
        </Card>
      </Reveal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.bg },
  content:    { padding: spacing.xl, paddingTop: spacing.hero, paddingBottom: sizes.tabBarSpace },
  title:      { ...type.brand, fontSize: fontSizes.xxl, color: colors.text, marginBottom: spacing.xl },
  row:        { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  rowText:    { flex: 1 },
  rowLabel:   { ...type.bodyStrong, fontSize: fontSizes.base, color: colors.text },
  rowHint:    { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
  regionHint: { marginBottom: spacing.md },
  divider:    { height: sizes.hairline, backgroundColor: colors.border, marginHorizontal: spacing.lg },
  about:      { ...type.bodyStrong, fontSize: fontSizes.base, color: colors.text },
  legal:      { ...type.micro, color: colors.textFaint, marginTop: spacing.md, lineHeight: lineHeights.small },
});
