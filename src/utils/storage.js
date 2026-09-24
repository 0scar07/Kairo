import AsyncStorage from "@react-native-async-storage/async-storage";
import { LEGACY_KEYS } from "../constants/config";

// Copia los datos guardados con los nombres antiguos de la app a las claves nuevas
export async function migrateLegacyStorage() {
  for (const [newKey, oldKeys] of Object.entries(LEGACY_KEYS)) {
    try {
      if (await AsyncStorage.getItem(newKey)) continue;
      for (const oldKey of oldKeys) {
        const value = await AsyncStorage.getItem(oldKey);
        if (value) {
          await AsyncStorage.setItem(newKey, value);
          await AsyncStorage.removeItem(oldKey);
          break;
        }
      }
    } catch (e) {
      console.warn("Migración de almacenamiento:", newKey, e.message);
    }
  }
}
