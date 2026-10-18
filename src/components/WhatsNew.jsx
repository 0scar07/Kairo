import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Sheet, PressableScale } from "./ui";
import Icon from "./Icon";
import { useT } from "../i18n/I18nProvider";
import { useBootData } from "../boot/BootContext";
import { LAST_SEEN_VERSION_KEY } from "../constants/config";
import { colors, radii, sizes, spacing, type, useAccent, withAlpha } from "../theme";

const VERSION = Constants.expoConfig?.version || "";
// Revisión de las novedades dentro de la misma versión: las actualizaciones por aire no cambian la versión de la app,
// así que al cambiar las novedades se sube este número para que vuelvan a mostrarse una vez
const REVISION = 2;
const SEEN_ID = `${VERSION}#${REVISION}`;
const ITEMS = [
  { icon: "award",    title: "whatsNew.profile.title", text: "whatsNew.profile.text" },
  { icon: "trophy",   title: "whatsNew.queues.title",  text: "whatsNew.queues.text" },
  { icon: "search",   title: "whatsNew.explore.title", text: "whatsNew.explore.text" },
  { icon: "crown",    title: "whatsNew.pros.title",    text: "whatsNew.pros.text" },
  { icon: "barChart", title: "whatsNew.matches.title", text: "whatsNew.matches.text" },
];

// Abrir la hoja desde otra pantalla (Ajustes › Novedades)
let openFn = null;
export const openWhatsNew = () => openFn?.();

/**
 * "Novedades" al estilo de Apple: aparece una sola vez después de actualizar la app.
 * En una instalación nueva no se muestra (no hay nada "nuevo" para quien acaba de llegar).
 */
export default function WhatsNew() {
  const t = useT();
  const accent = useAccent();
  const { favorites, recents } = useBootData();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    openFn = () => setOpen(true);
    let timer;
    AsyncStorage.getItem(LAST_SEEN_VERSION_KEY)
      .then(seen => {
        if (seen === SEEN_ID) return;
        const existingUser = seen != null || favorites.length > 0 || recents.length > 0;
        AsyncStorage.setItem(LAST_SEEN_VERSION_KEY, SEEN_ID).catch(e => console.warn("Novedades:", e.message));
        if (existingUser) timer = setTimeout(() => setOpen(true), 900);   // tras el fundido de la pantalla de carga
      })
      .catch(e => console.warn("Novedades:", e.message));
    return () => { openFn = null; clearTimeout(timer); };
  }, []);

  return (
    <Sheet visible={open} onClose={() => setOpen(false)}>
      <Text style={styles.title} accessibilityRole="header">{t("whatsNew.title", { version: VERSION })}</Text>
      <View style={styles.list}>
        {ITEMS.map(it => (
          <View key={it.title} style={styles.item}>
            <View style={[styles.icon, { backgroundColor: withAlpha(accent, 0.14) }]}>
              <Icon name={it.icon} size={sizes.item} color={accent} filled={it.icon === "star"} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.itemTitle}>{t(it.title)}</Text>
              <Text style={styles.itemText}>{t(it.text)}</Text>
            </View>
          </View>
        ))}
      </View>
      <PressableScale haptic onPress={() => setOpen(false)} style={[styles.button, { backgroundColor: accent }]}>
        <Text style={styles.buttonText}>{t("whatsNew.continue")}</Text>
      </PressableScale>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  title:      { ...type.largeTitle, fontSize: type.title.fontSize + spacing.sm, color: colors.text, marginBottom: spacing.xl },
  list:       { gap: spacing.lg, marginBottom: spacing.xl },
  item:       { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  icon:       { width: sizes.avatarLg, height: sizes.avatarLg, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  copy:       { flex: 1 },
  itemTitle:  { ...type.bodyStrong, fontSize: type.body.fontSize, color: colors.text },
  itemText:   { ...type.small, color: colors.textSecondary, marginTop: spacing.xxs, lineHeight: type.body.fontSize + 2 },
  button:     { minHeight: sizes.button, borderRadius: radii.lg, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  buttonText: { ...type.bodyStrong, fontSize: type.body.fontSize, color: colors.onAccent },
});
