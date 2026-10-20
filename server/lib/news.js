/**
 * Noticias de los juegos de Kairo, de sus fuentes oficiales y públicas (sin keys):
 *  - LoL, TFT, Valorant y Wild Rift: las webs oficiales de Riot (Next.js; los datos vienen en __NEXT_DATA__).
 *  - Dota 2, Apex Legends y PUBG: los anuncios de Steam (ISteamNews, solo en inglés).
 *  - Fortnite: las noticias del juego de fortnite-api.com.
 * Y el lector de artículos de Riot: las notas del parche se convierten en secciones, campeones y cambios
 * "antes → ahora" en texto plano (nunca se manda HTML a la app).
 */

// Webs de Riot y su sección de noticias. Solo se leen artículos de estos dominios (ver articlePath).
const RIOT_SITES = {
  lol: "https://www.leagueoflegends.com",
  tft: "https://teamfighttactics.leagueoflegends.com",
  valorant: "https://playvalorant.com",
  wildrift: "https://wildrift.leagueoflegends.com",
};
// Idioma de la app → sección de las webs de Riot
const LOCALES = { es: "es-mx", en: "en-us", pt: "pt-br", fr: "fr-fr", de: "de-de" };
// Steam: juegos y su appid
const STEAM_APPS = { dota2: 570, apex: 1172470, pubg: 578080 };
// fortnite-api.com usa sus propios códigos de idioma
const FORTNITE_LANGS = { es: "es-419", en: "en", pt: "pt-BR", fr: "fr", de: "de" };

const PATCH_URL = /patch-notes|patch-\d/;

/** Quita las etiquetas repitiendo hasta que no quede ninguna (una etiqueta puede esconder otra) y los < o > sueltos */
function plainText(html) {
  // Las etiquetas de bloque separan palabras ("<strong>Modo</strong><ul><li>Corregimos" → "Modo Corregimos")
  let text = String(html || "")
    .replace(/<\/?(?:br|p|div|li|ul|ol|h[1-6]|blockquote)(?=[\s>/])[^>]*>/gi, " ")
    .replace(/&nbsp;/g, " ");
  let prev;
  do { prev = text; text = text.replace(/<[^<>]*>/g, ""); } while (text !== prev);
  text = text.replace(/[<>]/g, "")
    .replace(/&quot;/g, "\"").replace(/&#x27;|&#39;/g, "'").replace(/&lt;|&gt;/g, "")
    .replace(/&amp;/g, "&");
  return text.replace(/\s+/g, " ").trim();
}

/** Las imágenes del CMS de Riot (cmsassets) se pueden pedir más chicas: ?w=900 pesa la tercera parte */
function sized(url, width) {
  if (!url || !/^https:\/\/cmsassets\.rgpub\.io\//.test(url)) return url || null;
  return `${url}${url.includes("?") ? "&" : "?"}w=${width}`;
}

/**
 * Noticias de una web de Riot a partir de __NEXT_DATA__: [{ title, date, url, path, image, color, category, patch }] de la
 * más nueva a la más vieja. Solo los enlaces a la propia web (los videos de YouTube y demás se descartan).
 */
function riotNews(data, site, limit = 8) {
  const seen = new Map();
  const walk = o => {
    if (!o || typeof o !== "object") return;
    const path = o.action?.payload?.url;
    if (typeof o.title === "string" && o.publishedAt && typeof path === "string" && path.startsWith("/")) {
      if (!seen.has(path)) {
        seen.set(path, {
          title: o.title,
          date: o.publishedAt,
          url: site + path,
          path,
          image: o.media?.url || o.imageMedia?.url || null,
          color: o.media?.colors?.primary || o.imageMedia?.colors?.primary || null,   // color dominante de la imagen
          category: String(o.category?.machineName || "").replace(/-/g, "_") || null,
          patch: PATCH_URL.test(path),
        });
      }
      return;
    }
    for (const v of Object.values(o)) walk(v);
  };
  walk(data);
  return [...seen.values()].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, limit);
}

/** Anuncio de Steam: la primera imagen del texto ({STEAM_CLAN_IMAGE}/… o [img]…[/img]) y un resumen corto */
function steamItem(n) {
  const text = String(n.contents || "");
  const clan = /\{STEAM_CLAN_IMAGE\}\/([^\s"\][]+\.(?:png|jpe?g|gif|webp))/i.exec(text);
  const img = clan ? `https://clan.akamai.steamstatic.com/images/${clan[1]}` : (/\[img\](https:[^[\]]+)\[\/img\]/i.exec(text)?.[1] || null);
  const summary = plainText(text.replace(/\[[^\]]*\]/g, " ").replace(/\{STEAM_CLAN_IMAGE\}\S*/g, " ")).slice(0, 180) || null;
  return {
    title: n.title,
    date: new Date((n.date || 0) * 1000).toISOString(),
    url: n.url,
    image: img,
    summary,
    patch: /patch|hotfix|latest update/i.test(n.title || ""),   // "An Update from the Anti Cheat Team" no es un parche
  };
}

// --- Lector de artículos ---

// Palabras de cambios donde un número MÁS BAJO es una mejora (enfriamiento, costo, precio…), en los cinco idiomas
const LOWER_IS_BETTER = /enfriamiento|recarga|costo|coste|precio|cooldown|cost|price|custo|preço|délai|coût|prix|abklingzeit|kosten|preis/i;
const ARROW = /\s*(?:⇒|→|=>)\s*/;

/** "Daño: 70 / 105 ⇒ 70 / 115" → { label, before, after, dir } (dir: 1 mejora, -1 empeora, 0 no se sabe) */
function parseChange(text) {
  const parts = text.split(ARROW);
  if (parts.length !== 2) return { text };
  let [before, after] = parts;
  let label = null;
  const colon = before.indexOf(":");
  if (colon > 0 && colon < 90) { label = before.slice(0, colon).trim(); before = before.slice(colon + 1).trim(); }
  const nums = s => (s.match(/-?\d+(?:[.,]\d+)?/g) || []).map(x => Number(x.replace(",", ".")));
  const a = nums(before), b = nums(after);
  let dir = 0;
  if (a.length && b.length) {
    dir = Math.sign(b.reduce((x, y) => x + y, 0) - a.reduce((x, y) => x + y, 0));
    if (LOWER_IS_BETTER.test(label || "")) dir = -dir;
  }
  return { label, before: before.trim(), after: after.trim(), dir };
}

const sumDir = groups => Math.sign(groups.flatMap(g => g.lines).reduce((n, l) => n + (l.dir || 0), 0));
const firstImg = html => /<img[^>]+src="([^"]+)"/.exec(html)?.[1] || null;
// Las imágenes de los campeones de LoL vienen envueltas: https://am-a.akamaihd.net/image?f=<url de Data Dragon>
const unwrap = url => { const m = /[?&]f=([^&]+)/.exec(url || ""); return m ? decodeURIComponent(m[1]) : url; };
const LIMIT = { sections: 14, entries: 60, groups: 12, lines: 30, notes: 8, note: 600 };

/** Lista "<ul><li>…</li></ul>" → líneas */
const listLines = html => [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map(m => plainText(m[1])).filter(Boolean).slice(0, LIMIT.lines).map(parseChange);

/** Grupos genéricos: cada lista con el título que la precede (h3, h4, strong o párrafo corto) */
function genericGroups(html) {
  const groups = [];
  const notes = [];
  const tokens = [...html.matchAll(/<(h[3-6]|p|ul|ol|blockquote)[^>]*>([\s\S]*?)<\/\1>/g)];
  let title = null;
  for (const [, tag, inner] of tokens) {
    if (tag === "ul" || tag === "ol") {
      const lines = listLines(inner);
      if (lines.length) groups.push({ title, icon: null, lines });
      title = null;
    } else {
      const text = plainText(inner);
      if (!text) continue;
      if (/^h/.test(tag) || text.length <= 80) {
        if (title && title.length > 0) notes.push(title);   // un título que no tuvo lista era un párrafo corto
        title = text;
      } else {
        if (title) { notes.push(title); title = null; }
        notes.push(text.slice(0, LIMIT.note));
      }
    }
  }
  if (title) notes.push(title);
  return { groups: groups.slice(0, LIMIT.groups), notes: notes.slice(0, LIMIT.notes) };
}

/** Bloque de cambios de LoL (patch-change-block): campeón u objeto, el porqué y sus grupos de cambios */
function lolBlock(html) {
  const name = plainText(/class="change-title"[^>]*>([\s\S]*?)<\/h3>/.exec(html)?.[1]);
  if (!name) return null;
  const image = unwrap(firstImg(html));
  const champ = /\/img\/champion\/([A-Za-z]+)\.png/.exec(image || "")?.[1] || null;
  const groups = [...html.matchAll(/<h4[^>]*>([\s\S]*?)<\/h4>\s*<ul>([\s\S]*?)<\/ul>/g)].slice(0, LIMIT.groups).map(m => ({
    title: plainText(m[1]) || null,
    icon: unwrap(firstImg(m[1])),
    lines: listLines(m[2]),
  }));
  return {
    kind: champ ? "champion" : /\/img\/item\//.test(image || "") ? "item" : "block",
    name,
    key: champ,
    image,
    banner: champ ? `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champ}_0.jpg` : null,
    context: plainText(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/.exec(html)?.[1]) || null,
    groups,
    dir: sumDir(groups),
  };
}

/** Una sección (lo que hay entre dos títulos h1/h2) */
function section(title, html) {
  const image = [...html.matchAll(/<img[^>]+src="(https:\/\/cmsassets\.rgpub\.io\/[^"]+)"/g)].map(m => m[1])[0] || null;
  if (html.includes("patch-change-block")) {
    const entries = html.split("patch-change-block").slice(1).map(lolBlock).filter(Boolean);
    return { title, image: null, entries, groups: [], notes: [] };
  }
  const { groups, notes } = genericGroups(html);
  return { title, image: sized(image, 900), entries: [], groups, notes };
}

/** Cambios de Wild Rift (characterChanges): cada campeón con su banner, su resumen y sus habilidades */
function wrCharacters(blade) {
  const entries = (blade.characters || []).slice(0, LIMIT.entries).map(c => {
    const groups = (c.changes || []).slice(0, LIMIT.groups).map(ch => ({
      title: ch.title || null,
      icon: ch.icon?.url || null,
      lines: listLines(ch.description?.body || ""),
    }));
    const name = String(c.character?.name || "").toLowerCase().replace(/(^|[\s'-])\S/g, s => s.toUpperCase());
    return {
      kind: "champion",
      name,
      key: null,
      image: null,
      banner: sized(c.character?.media?.url, 900),
      role: c.character?.role?.label || null,
      context: plainText(c.summary?.body) || null,
      groups,
      dir: sumDir(groups),
    };
  });
  return { title: blade.title || null, image: null, entries, groups: [], notes: [] };
}

/**
 * Artículo de una web de Riot (notas del parche u otra noticia) a partir de __NEXT_DATA__:
 * { title, date, image, summary, sections: [{ title, image, entries, groups, notes }], counts }.
 * El cuerpo puede venir en uno o varios bloques de texto (Valorant, Wild Rift) o en uno solo con bloques por campeón (LoL).
 */
function parseArticle(data) {
  const page = data?.props?.pageProps?.page;
  if (!page || !Array.isArray(page.blades)) return null;
  const mast = page.blades.find(b => b.type === "articleMasthead") || {};
  const sections = [];
  let intro = null;
  for (const blade of page.blades) {
    if (blade.type === "characterChanges") { sections.push(wrCharacters(blade)); continue; }
    const body = blade.richText?.body;
    if (!body) continue;
    // Se parte por h1/h2; lo que va antes del primer título es la introducción
    const parts = body.split(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/);
    const lead = parts[0];
    if (plainText(lead)) {
      if (!intro && sections.length === 0) intro = plainText(lead).slice(0, LIMIT.note);
      else sections.push(section(null, lead));
    }
    for (let i = 1; i < parts.length; i += 2) {
      const title = plainText(parts[i]) || null;
      const s = section(title, parts[i + 1] || "");
      if (s.entries.length || s.groups.length || s.notes.length || s.image) sections.push(s);
    }
  }
  const list = sections.slice(0, LIMIT.sections);
  const entries = list.flatMap(s => s.entries);
  const champs = entries.filter(e => e.kind === "champion");
  return {
    title: mast.title || page.title || null,
    date: mast.publishDate || page.displayedPublishDate || null,
    image: sized(mast.banner?.url || page.metaImage?.url || null, 1200),
    summary: plainText(mast.description?.body) || intro,
    sections: list,
    counts: {
      champions: champs.length,
      up: champs.filter(e => e.dir > 0).length,
      down: champs.filter(e => e.dir < 0).length,
      items: entries.filter(e => e.kind === "item").length,
    },
  };
}

/** Ruta de un artículo válida para leer: /es-mx/news/<categoría>/<slug> (evita pedir otra cosa a la web) */
const articlePath = path => /^\/[a-z]{2}-[a-z]{2}\/news\/[a-z0-9_-]+\/[a-z0-9_-]+\/?$/.test(String(path || ""));

module.exports = {
  RIOT_SITES, LOCALES, STEAM_APPS, FORTNITE_LANGS,
  plainText, sized, riotNews, steamItem, parseChange, parseArticle, articlePath,
};
