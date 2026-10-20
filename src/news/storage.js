import AsyncStorage from "@react-native-async-storage/async-storage";

// Lo que la pestaña Noticias guarda en el teléfono (sin cuenta ni servidor):
//  - Mi lista: noticias guardadas para después
//  - Seguir leyendo: artículos que quedaron a medias, con cuánto se leyó y la sección donde se quedó
//  - El tamaño de letra del lector
const LIST_KEY = "kairo_news_list";
const READING_KEY = "kairo_news_reading";
const FONT_KEY = "kairo_news_font";
const MAX = 20;

const read = async key => { try { const v = JSON.parse((await AsyncStorage.getItem(key)) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
const write = (key, list) => AsyncStorage.setItem(key, JSON.stringify(list.slice(0, MAX))).catch(() => {});
// Solo lo necesario para pintar la tarjeta y volver a abrir la noticia
const slim = item => ({ id: item.id, game: item.game, kind: item.kind, title: item.title, date: item.date || null, image: item.image || null, color: item.color || null, url: item.url || null, article: item.article || null });

export const loadMyList = () => read(LIST_KEY);
/** Guarda o quita una noticia de Mi lista; devuelve { list, saved } */
export async function toggleMyList(item) {
  const list = await read(LIST_KEY);
  const saved = !list.some(i => i.id === item.id);
  const next = saved ? [slim(item), ...list] : list.filter(i => i.id !== item.id);
  await write(LIST_KEY, next);
  return { list: next, saved };
}

export const loadReading = () => read(READING_KEY);
/** Anota cuánto se leyó (0–1) y en qué sección; al pasar del 95 % sale de "Seguir leyendo" */
export async function saveReading(item, progress, section) {
  const list = (await read(READING_KEY)).filter(i => i.id !== item.id);
  const next = progress >= 0.95 || progress < 0.05 ? list : [{ ...slim(item), progress, section: section || null, at: Date.now() }, ...list];
  await write(READING_KEY, next);
}

export const FONT_SCALES = [0.92, 1, 1.15];
export async function loadFontScale() {
  try { const v = Number(await AsyncStorage.getItem(FONT_KEY)); return FONT_SCALES.includes(v) ? v : 1; } catch { return 1; }
}
export const saveFontScale = v => AsyncStorage.setItem(FONT_KEY, String(v)).catch(() => {});
