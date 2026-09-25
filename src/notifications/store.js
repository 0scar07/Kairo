import AsyncStorage from "@react-native-async-storage/async-storage";
import { NOTIF_PREFS_KEY, NOTIF_DEVICE_KEY, NOTIF_LAST_KEY } from "../constants/config";

// Preferencias de notificaciones (en el celular; se copian al servidor al sincronizar)
export const DEFAULT_PREFS = {
  enabled: true,        // interruptor general
  notifyStart: true,    // avisar cuando entra en partida
  notifyEnd: true,      // avisar el resultado al terminar
  weekly: true,         // resumen semanal (domingo por la tarde)
  rankAlerts: true,     // avisos de cambio de rango de los favoritos
  trophyAlerts: true,   // Brawl Stars y Clash Royale: récords de trofeos de los favoritos
  quiet: { enabled: false, from: "23:00", to: "07:00" },   // horario silencioso
};

export async function loadPrefs() {
  try {
    const saved = JSON.parse((await AsyncStorage.getItem(NOTIF_PREFS_KEY)) || "{}");
    return { ...DEFAULT_PREFS, ...saved, quiet: { ...DEFAULT_PREFS.quiet, ...saved.quiet } };
  } catch (e) {
    console.warn("Preferencias de notificaciones ilegibles:", e.message);
    return DEFAULT_PREFS;
  }
}

export const savePrefs = prefs => AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));

// Credenciales del dispositivo en el servidor: { deviceId, secret } (se reciben una sola vez al registrarse)
export async function loadDevice() {
  try {
    const d = JSON.parse((await AsyncStorage.getItem(NOTIF_DEVICE_KEY)) || "null");
    return d?.deviceId && d?.secret ? d : null;
  } catch (e) {
    console.warn("Credenciales de notificaciones ilegibles:", e.message);
    return null;
  }
}
export const saveDevice = device => AsyncStorage.setItem(NOTIF_DEVICE_KEY, JSON.stringify(device));
export const clearDevice = () => AsyncStorage.removeItem(NOTIF_DEVICE_KEY);

// Última notificación tocada que ya se atendió: al abrir la app normalmente Android puede devolver la anterior
export const loadLastHandled = () => AsyncStorage.getItem(NOTIF_LAST_KEY);
export const saveLastHandled = id => AsyncStorage.setItem(NOTIF_LAST_KEY, String(id));
