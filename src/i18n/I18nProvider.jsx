import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LANGUAGE_KEY } from "../constants/config";
import { AUTO, getLanguage, isLanguage, resolveLanguage, setActiveLanguage, t as translate } from "./index";
import { loadChampionNames } from "../api/ddragon";

const I18nContext = createContext({
  t: translate, language: "es", preference: AUTO, setPreference: () => {}, ready: true,
});

/**
 * Idioma de la app. `preference` es lo que eligió el usuario ("auto" o un idioma) y `language` el que se usa.
 * Cambiarlo vuelve a pintar todo lo que use useT(); el módulo `t` de i18n/index.js también sigue el idioma activo.
 */
export function I18nProvider({ children }) {
  const [preference, setPreferenceState] = useState(AUTO);
  const [ready, setReady] = useState(false);
  const [namesVersion, setNamesVersion] = useState(0);   // sube al cargar los nombres de campeones del nuevo idioma
  const language = resolveLanguage(preference);

  // Se aplica durante el render para que los hijos ya pinten en el idioma correcto
  setActiveLanguage(language);

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_KEY)
      .then(saved => { if (saved === AUTO || isLanguage(saved)) setPreferenceState(saved); })
      .catch(e => console.warn("No se pudo leer el idioma:", e.message))
      .finally(() => setReady(true));
  }, []);

  // Nombres de campeones (Data Dragon) en el idioma elegido; al terminar se vuelve a pintar
  useEffect(() => {
    let cancelled = false;
    loadChampionNames(getLanguage(language).ddragon).then(() => { if (!cancelled) setNamesVersion(v => v + 1); });
    return () => { cancelled = true; };
  }, [language]);

  const setPreference = useCallback(pref => {
    const next = pref === AUTO || isLanguage(pref) ? pref : AUTO;
    setPreferenceState(next);
    AsyncStorage.setItem(LANGUAGE_KEY, next).catch(e => console.warn("No se pudo guardar el idioma:", e.message));
  }, []);

  // Una función nueva por idioma: así los componentes memoizados también se actualizan
  const value = useMemo(
    () => ({ t: (key, params) => translate(key, params), language, preference, setPreference, ready }),
    [language, preference, setPreference, ready, namesVersion]
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
export const useT = () => useContext(I18nContext).t;
