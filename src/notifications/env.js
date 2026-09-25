import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";

// EXPO_PUBLIC_NOTIF_PREVIEW=1 activa las pantallas de notificaciones en la web sin red ni permisos reales:
// solo sirve para ver el diseño y sacar capturas. Nunca se define en los builds de EAS.
export const PREVIEW = process.env.EXPO_PUBLIC_NOTIF_PREVIEW === "1";

// Las push remotas solo funcionan en un Android real con la app instalada (no en Expo Go, iPhone sin cuenta Apple ni web)
const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
export const pushSupported = PREVIEW || (Platform.OS === "android" && Device.isDevice && !inExpoGo);
