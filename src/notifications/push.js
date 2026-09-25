import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { PREVIEW } from "./env";

// Un canal por tipo de aviso: en Android el sonido se define en el canal y no se puede cambiar después de crearlo
export const CHANNEL_START = "live_start";
export const CHANNEL_RESULT = "live_result";
export const CHANNEL_PROGRESS = "progress";   // resumen semanal y cambios de rango (sonido por defecto)
export const CATEGORY_ID = "live_game";
export const ACTION_VIEW = "view";
export const ACTION_MUTE = "mute";

let previewPermission = "undetermined";

// "granted" | "undetermined" (se puede pedir) | "denied" (hay que ir a los ajustes del sistema)
const mapPermission = p => (p.granted ? "granted" : p.canAskAgain === false ? "denied" : "undetermined");

export async function getPermission() {
  if (PREVIEW) return previewPermission;
  return mapPermission(await Notifications.getPermissionsAsync());
}

export async function requestPermission() {
  if (PREVIEW) { previewPermission = "granted"; return previewPermission; }
  return mapPermission(await Notifications.requestPermissionsAsync());
}

// Canal de Android y botones de la notificación, con los textos en el idioma actual. Android 13+ exige que el canal
// exista antes de pedir el permiso.
export async function setupChannel(t, accent) {
  if (PREVIEW || Platform.OS !== "android") return;
  const base = {
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: accent,
    vibrationPattern: [0, 200, 120, 200],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    showBadge: false,
  };
  await Notifications.setNotificationChannelAsync(CHANNEL_START, { ...base, name: t("notif.channelStart"), description: t("notif.channelStartDesc"), sound: "live_start.wav" });
  await Notifications.setNotificationChannelAsync(CHANNEL_RESULT, { ...base, name: t("notif.channelResult"), description: t("notif.channelResultDesc"), sound: "live_result.wav" });
  await Notifications.setNotificationChannelAsync(CHANNEL_PROGRESS, { ...base, importance: Notifications.AndroidImportance.DEFAULT, vibrationPattern: undefined, name: t("notif.channelProgress"), description: t("notif.channelProgressDesc") });
  await Notifications.deleteNotificationChannelAsync("live").catch(() => {});   // el canal de la versión anterior (sin sonido propio)
  await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
    { identifier: ACTION_VIEW, buttonTitle: t("notif.view"), options: { opensAppToForeground: true } },
    { identifier: ACTION_MUTE, buttonTitle: t("notif.mute"), options: { opensAppToForeground: true } },
  ]);
}

export async function getPushToken() {
  if (PREVIEW) return "ExponentPushToken[vistapreviavistaprevia]";
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

// Con la app abierta: showSystem=false oculta la notificación del sistema (se muestra el banner de la app en su lugar)
export function installForegroundHandler(showSystem = true) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: showSystem, shouldShowList: showSystem, shouldPlaySound: false, shouldSetBadge: false }),
  });
}
