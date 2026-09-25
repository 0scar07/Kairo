import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Linking, Platform, ToastAndroid } from "react-native";
import * as Notifications from "expo-notifications";
import { useI18n } from "../i18n/I18nProvider";
import { accents } from "../theme";
import { errorMessage } from "../utils/format";
import { canAlert, hasAlerts, loadFavorites, onFavoritesChanged, setFavoriteAlerts } from "../utils/favorites";
import { openFromNotification } from "./routes";
import { PREVIEW, pushSupported } from "./env";
import {
  ACTION_MUTE, getPermission, getPushToken, installForegroundHandler, requestPermission, setupChannel,
} from "./push";
import { DEFAULT_PREFS, clearDevice, loadDevice, loadLastHandled, loadPrefs, saveDevice, saveLastHandled, savePrefs } from "./store";
import { isAuthError, putFavorites, putSettings, putToken, registerDevice, sendTest as sendTestRequest } from "./api";
import { emitLive } from "./events";

const MAX_ALERTS = 30;   // tope de favoritos con alertas (el servidor rechaza más)

const NotificationsContext = createContext({
  supported: false, permission: "undetermined", prefs: DEFAULT_PREFS, setPref: () => {}, toggleAlerts: async () => {},
  sheet: null, confirmSheet: () => {}, closeSheet: () => {}, openSystemSettings: () => {}, askPermission: async () => {}, sendTest: async () => {},
  favoritesVersion: 0, lastError: null,
});

// "live_start" -> "start", "live_end" -> "end", cualquier otra cosa -> "test"
const kindOf = type => (type === "live_start" ? "start" : type === "live_end" ? "end" : "test");

/**
 * Notificaciones de partida en vivo (solo LoL, push solo en Android por ahora):
 *  - guarda las preferencias y el permiso del sistema;
 *  - sincroniza favoritos con alertas y ajustes con el backend (registro sin cuentas, ver server/routes/devices.js);
 *  - atiende los toques en las notificaciones (abrir la partida, silenciar al jugador) y reenvía las que llegan con la
 *    app abierta al banner interno.
 * En plataformas sin soporte (iPhone, web, Expo Go) `supported` es false y todo lo demás es inerte.
 */
export function NotificationsProvider({ children }) {
  const { t, language } = useI18n();
  const [prefs, setPrefsState] = useState(DEFAULT_PREFS);
  const [permission, setPermission] = useState("undetermined");
  const [sheet, setSheet] = useState(null);   // { fav, mode: "explain" | "denied" }
  const [favoritesVersion, setFavoritesVersion] = useState(0);
  const [lastError, setLastError] = useState(null);

  // Las funciones de sincronización leen siempre lo último desde refs (no se recrean con cada cambio)
  const prefsRef = useRef(prefs);
  const languageRef = useRef(language);
  const tRef = useRef(t);
  prefsRef.current = prefs;
  languageRef.current = language;
  tRef.current = t;
  const syncTimer = useRef(null);
  const queue = useRef(Promise.resolve());

  const buildPayload = useCallback(async () => {
    // Todos los favoritos de LoL: los de la campanita avisan en vivo; los demás (muted) solo cuentan para el historial,
    // el resumen semanal y los cambios de rango
    const favorites = (await loadFavorites()).filter(canAlert).slice(0, MAX_ALERTS)
      .map(f => ({ puuid: f.puuid, region: f.region, riotId: `${f.gameName}#${f.tagLine}`, muted: !hasAlerts(f) }));
    const p = prefsRef.current;
    return {
      favorites,
      settings: {
        enabled: p.enabled, notifyStart: p.notifyStart, notifyEnd: p.notifyEnd, weekly: p.weekly, rankAlerts: p.rankAlerts, locale: languageRef.current,
        // hora local menos UTC en minutos (Bogotá = -300); getTimezoneOffset devuelve lo contrario
        quiet: { enabled: p.quiet.enabled, from: p.quiet.from, to: p.quiet.to, utcOffsetMinutes: -new Date().getTimezoneOffset() },
      },
    };
  }, []);

  // Copia favoritos con alertas y ajustes al servidor. force: registrar el dispositivo aunque aún no haya favoritos.
  const syncNow = useCallback(async ({ force = false } = {}) => {
    if (!pushSupported || PREVIEW) return;
    if ((await getPermission()) !== "granted") return;
    const { favorites, settings } = await buildPayload();
    let device = await loadDevice();
    if (!device && favorites.length === 0 && !force) return;   // nada que avisar: no se crea el registro

    const register = async () => {
      const r = await registerDevice({ pushToken: await getPushToken(), platform: "android", favorites, settings });
      device = { deviceId: r.deviceId, secret: r.secret };
      await saveDevice(device);
    };
    try {
      if (!device) { await register(); return; }
      await putSettings(device, settings);
      await putFavorites(device, favorites);
    } catch (e) {
      if (!isAuthError(e)) throw e;
      await clearDevice();   // el servidor ya no lo reconoce: se vuelve a registrar
      await register();
    }
  }, [buildPayload]);

  // Encadena las sincronizaciones para que nunca corran dos a la vez
  const runSync = useCallback((opts) => {
    queue.current = queue.current.then(() => syncNow(opts)).then(
      () => setLastError(null),
      e => { console.warn("Sincronización de notificaciones:", e.message); setLastError(errorMessage(e)); throw e; },
    ).catch(() => {});
    return queue.current;
  }, [syncNow]);

  const scheduleSync = useCallback((delay = 1500) => {
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => runSync(), delay);
  }, [runSync]);

  // ---- arranque: preferencias, permiso, canal y controlador de primer plano
  useEffect(() => {
    if (!pushSupported) return undefined;
    loadPrefs().then(setPrefsState);
    getPermission().then(setPermission).catch(e => console.warn("Permiso de notificaciones:", e.message));
    installForegroundHandler(false);   // con la app abierta se muestra el banner de la app (BannerHost), no el del sistema
    const sub = AppState.addEventListener("change", state => {
      if (state === "active") getPermission().then(setPermission).catch(() => {});   // pudo cambiarse en los ajustes del sistema
    });
    return () => sub.remove();
  }, []);

  // Canal y botones con los textos del idioma actual; el idioma también viaja al servidor (textos de la notificación)
  useEffect(() => {
    if (!pushSupported) return;
    setupChannel(t, accents.lol).catch(e => console.warn("Canal de notificaciones:", e.message));
    scheduleSync(2500);
  }, [language]);

  // Cualquier cambio en los favoritos (o en sus alertas) se copia al servidor
  useEffect(() => {
    if (!pushSupported) return undefined;
    return onFavoritesChanged(() => { setFavoritesVersion(v => v + 1); scheduleSync(); });
  }, [scheduleSync]);

  // ---- notificaciones que llegan o se tocan
  useEffect(() => {
    if (!pushSupported || PREVIEW) return undefined;

    const attend = async response => {
      const id = String(response.notification.date ?? response.notification.request.identifier);
      if ((await loadLastHandled()) === id) return;   // ya se atendió (Android puede devolverla otra vez al abrir la app)
      await saveLastHandled(id);
      const data = response.notification.request.content.data || {};
      if (response.actionIdentifier === ACTION_MUTE) {
        const fav = (await loadFavorites()).find(f => f.puuid === data.puuid);
        if (fav) {
          await setFavoriteAlerts(fav, false);
          if (Platform.OS === "android") ToastAndroid.show(tRef.current("notif.muted", { name: fav.gameName }), ToastAndroid.SHORT);
        }
        return;
      }
      openFromNotification(data);
    };

    const received = Notifications.addNotificationReceivedListener(n => {
      const { title, body, data } = n.request.content;
      emitLive({ id: n.request.identifier, kind: kindOf(data?.type), title, body, data: data || {} });
    });
    const tapped = Notifications.addNotificationResponseReceivedListener(r => { attend(r).catch(e => console.warn("Notificación:", e.message)); });
    const pushToken = Notifications.addPushTokenListener(async ({ data }) => {
      const device = await loadDevice();
      if (device) putToken(device, data).catch(e => console.warn("No se pudo actualizar el token:", e.message));
    });
    // La app se abrió tocando una notificación con la app cerrada
    Notifications.getLastNotificationResponseAsync().then(r => { if (r) attend(r).catch(() => {}); }).catch(() => {});

    return () => { received.remove(); tapped.remove(); pushToken.remove(); };
  }, []);

  // ---- acciones para la interfaz
  const setPref = useCallback(patch => {
    const next = { ...prefsRef.current, ...patch, quiet: { ...prefsRef.current.quiet, ...patch.quiet } };
    setPrefsState(next);
    savePrefs(next).catch(e => console.warn("No se pudieron guardar las preferencias:", e.message));
    scheduleSync(800);
  }, [scheduleSync]);

  // Campanita de un favorito. Si aún no hay permiso se abre la hoja explicativa y el resto ocurre en confirmSheet.
  const toggleAlerts = useCallback(async fav => {
    if (!pushSupported) return;
    if (hasAlerts(fav)) { await setFavoriteAlerts(fav, false); return; }
    const current = await getPermission();
    setPermission(current);
    if (current === "granted") { await setFavoriteAlerts(fav, true); return; }
    setSheet({ fav, mode: current === "denied" ? "denied" : "explain" });
  }, []);

  const confirmSheet = useCallback(async () => {
    const fav = sheet?.fav;
    if (!fav) return;
    try {
      await setupChannel(tRef.current, accents.lol);
      const result = await requestPermission();
      setPermission(result);
      if (result === "granted") { await setFavoriteAlerts(fav, true); setSheet(null); }
      else setSheet({ fav, mode: "denied" });
    } catch (e) {
      setSheet(null);
      setLastError(errorMessage(e));
    }
  }, [sheet]);

  const closeSheet = useCallback(() => setSheet(null), []);

  // Pedir el permiso del sistema desde Ajustes (sin pasar por la campanita de un favorito)
  const askPermission = useCallback(async () => {
    try {
      await setupChannel(tRef.current, accents.lol);
      const result = await requestPermission();
      setPermission(result);
      if (result === "granted") scheduleSync(500);
    } catch (e) {
      setLastError(errorMessage(e));
    }
  }, [scheduleSync]);
  const openSystemSettings = useCallback(() => { Linking.openSettings().catch(e => console.warn("No se pudieron abrir los ajustes:", e.message)); }, []);

  // Manda una notificación de prueba a este celular (registra el dispositivo si hace falta)
  const sendTest = useCallback(async type => {
    if (PREVIEW) return { ok: true };
    await runSync({ force: true });
    const device = await loadDevice();
    if (!device) throw new Error(tRef.current("notif.registerError", { error: "" }));
    const result = await sendTestRequest(device, type);
    if (!result.ok) throw new Error(result.error || "SEND_FAILED");
    return result;
  }, [runSync]);

  const value = useMemo(() => ({
    supported: pushSupported, permission, prefs, setPref, toggleAlerts, sheet, confirmSheet, closeSheet, openSystemSettings, askPermission,
    sendTest, favoritesVersion, lastError,
  }), [permission, prefs, setPref, toggleAlerts, sheet, confirmSheet, closeSheet, openSystemSettings, askPermission, sendTest, favoritesVersion, lastError]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export const useNotifications = () => useContext(NotificationsContext);
