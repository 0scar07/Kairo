import { getLocales } from "expo-localization";
import es from "./locales/es";
import en from "./locales/en";
import pt from "./locales/pt";
import fr from "./locales/fr";
import de from "./locales/de";

/**
 * Idiomas de la app. Para añadir uno: crear src/i18n/locales/<id>.js con las mismas claves que es.js
 * (`npm run verify` comprueba que no falte ninguna), importarlo aquí y añadirlo a LANGUAGES y DICTS.
 *  - label: cómo se llama en su propio idioma (así se ve en el selector)
 *  - ddragon: idioma de Data Dragon para los nombres de campeones
 *  - number: separador de miles
 */
export const LANGUAGES = [
  { id: "es", label: "Español",   ddragon: "es_MX", thousands: "." },
  { id: "en", label: "English",   ddragon: "en_US", thousands: "," },
  { id: "pt", label: "Português", ddragon: "pt_BR", thousands: "." },
  { id: "fr", label: "Français",  ddragon: "fr_FR", thousands: " " },
  { id: "de", label: "Deutsch",   ddragon: "de_DE", thousands: "." },
];

const DICTS = { es, en, pt, fr, de };

export const DEFAULT_LANGUAGE = "es";   // el idioma de referencia: de aquí salen las claves y los textos de respaldo
export const AUTO = "auto";

export const isLanguage = id => LANGUAGES.some(l => l.id === id);
export const getLanguage = id => LANGUAGES.find(l => l.id === id) || LANGUAGES[0];

// Idioma del dispositivo si la app lo tiene; si no, inglés
export function detectLanguage() {
  try {
    const code = getLocales()?.[0]?.languageCode;
    return isLanguage(code) ? code : "en";
  } catch (e) {
    return DEFAULT_LANGUAGE;
  }
}

// "auto" (o cualquier valor desconocido) -> idioma del dispositivo
export const resolveLanguage = pref => (isLanguage(pref) ? pref : detectLanguage());

let active = DEFAULT_LANGUAGE;
export const setActiveLanguage = id => { if (isLanguage(id)) active = id; };
export const activeLanguage = () => active;

// Busca la clave en el idioma activo y, si falta, en español; sin nada devuelve la propia clave
function lookup(key, language) {
  return DICTS[language]?.[key] ?? DICTS[DEFAULT_LANGUAGE][key];
}

export const hasKey = key => key in DICTS[active] || key in DICTS[DEFAULT_LANGUAGE];

/**
 * Traduce `key` en el idioma activo. `{nombre}` se sustituye con params.nombre.
 * Con params.count elige la variante `clave_one` (count === 1) o `clave_other` si existen.
 */
export function t(key, params) {
  let message;
  if (params && typeof params.count === "number") {
    message = lookup(`${key}_${params.count === 1 ? "one" : "other"}`, active);
  }
  message = message ?? lookup(key, active) ?? key;
  if (!params) return message;
  return message.replace(/\{(\w+)\}/g, (_, name) => (params[name] == null ? "" : String(params[name])));
}

export const dictionaries = DICTS;
