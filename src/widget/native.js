import { NativeModules, Platform, TurboModuleRegistry } from "react-native";

/**
 * ¿Este APK trae los widgets de Android (react-native-android-widget)? Las actualizaciones por aire también llegan a
 * APKs anteriores, que no los tienen, y la librería falla al importarse sin su parte nativa: por eso se carga siempre
 * con require() y solo después de comprobar esto.
 */
let ready = null;
export function hasWidgets() {
  if (Platform.OS !== "android") return false;
  if (ready == null) {
    try {
      ready = Boolean(TurboModuleRegistry?.get?.("AndroidWidget") || NativeModules.AndroidWidget);
    } catch {
      ready = false;
    }
  }
  return ready;
}

// Los tres widgets (mismos nombres que en app.json)
export const WIDGETS = { rank: "KairoRank", match: "KairoMatch", friends: "KairoFriends" };
