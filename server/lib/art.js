const crypto = require("node:crypto");
const path = require("node:path");
const axios = require("axios");
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const { championInfo } = require("./ddragon");
const { artText, queueName, LOCALES } = require("./pushText");

/**
 * Banner de las notificaciones (la imagen ancha que Android muestra al expandirlas): splash art del campeón oscurecido,
 * etiqueta EN VIVO / VICTORIA / DERROTA, nombre del jugador, cola y campeón (o el KDA en el resultado).
 *
 * Las imágenes las descarga el celular desde una URL pública del servidor, así que van FIRMADAS: solo se sirven las
 * URLs que el propio servidor generó (evita que cualquiera use el endpoint para renderizar imágenes a voluntad).
 */
GlobalFonts.registerFromPath(path.join(__dirname, "..", "assets", "fonts", "Sora_700Bold.ttf"), "Sora Bold");
GlobalFonts.registerFromPath(path.join(__dirname, "..", "assets", "fonts", "Sora_600SemiBold.ttf"), "Sora Semi");

const SECRET = process.env.ART_SECRET || crypto.randomBytes(32).toString("hex");   // sin ART_SECRET cambia en cada arranque: no importa, las URLs se usan en minutos
const KINDS = ["start", "win", "loss"];
const KEYS = ["k", "n", "q", "c", "l", "kda"];
const W = 1024, H = 512;
const GOLD = "#C89B3C", RED = "#E05555", GREEN = "#4FC97A";

const sign = qs => crypto.createHmac("sha256", SECRET).update(qs).digest("hex").slice(0, 24);
const baseUrl = () => (process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/$/, "");

// Cadena canónica: solo las claves conocidas y siempre en el mismo orden
function canonical(p) {
  const qs = new URLSearchParams();
  for (const key of KEYS) if (p[key] !== undefined && p[key] !== null && p[key] !== "") qs.set(key, String(p[key]));
  return qs.toString();
}

/** URL firmada del banner, o null si el servidor no conoce su dirección pública (entonces la notificación va sin imagen). */
function bannerUrl(params) {
  const base = baseUrl();
  if (!base) return null;
  const qs = canonical({ ...params, n: String(params.n || "").slice(0, 24) });
  return `${base}/art/banner.png?${qs}&sig=${sign(qs)}`;
}

function verify(query) {
  const qs = canonical(query);
  const given = Buffer.from(String(query.sig || ""));
  const expected = Buffer.from(sign(qs));
  return given.length === expected.length && crypto.timingSafeEqual(given, expected) ? qs : null;
}

// ---- imágenes de Data Dragon (en memoria, pocas)
const splashCache = new Map();
async function splash(imageId) {
  if (splashCache.has(imageId)) return splashCache.get(imageId);
  const { data } = await axios.get(`https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${imageId}_0.jpg`, { responseType: "arraybuffer", timeout: 8000 });
  const img = await loadImage(Buffer.from(data));
  if (splashCache.size >= 30) splashCache.delete(splashCache.keys().next().value);
  splashCache.set(imageId, img);
  return img;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Reduce el tamaño de letra hasta que el texto quepa en `max` píxeles
function fit(ctx, text, fontName, size, max) {
  let s = size;
  ctx.font = `${s}px "${fontName}"`;
  while (ctx.measureText(text).width > max && s > 28) { s -= 2; ctx.font = `${s}px "${fontName}"`; }
  return s;
}

async function renderBanner(p) {
  const locale = LOCALES.includes(p.l) ? p.l : "es";
  const t = artText(locale);
  const kind = KINDS.includes(p.k) ? p.k : "start";
  const info = await championInfo(Number(p.c), locale).catch(() => null);
  const champ = info?.name || "";
  const queue = queueName(Number(p.q) || null, locale);

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  roundRect(ctx, 0, 0, W, H, 28);
  ctx.clip();

  // fondo: splash art (recortado a "cover") o, si no se pudo descargar, un degradado oscuro
  ctx.fillStyle = "#0E171E";
  ctx.fillRect(0, 0, W, H);
  try {
    if (!info?.imageId) throw new Error("sin campeón");
    const img = await splash(info.imageId);
    const r = Math.max(W / img.width, H / img.height);
    const w = img.width * r, h = img.height * r;
    ctx.drawImage(img, 0, -(h - H) * 0.3, w, h);
  } catch (e) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#1B2A36"); g.addColorStop(1, "#0A1218");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  // oscurece de izquierda a derecha (para que el texto se lea) y un poco por abajo
  const side = ctx.createLinearGradient(0, 0, W * 0.85, 0);
  side.addColorStop(0, "rgba(7,12,15,0.94)"); side.addColorStop(0.55, "rgba(7,12,15,0.55)"); side.addColorStop(1, "rgba(7,12,15,0)");
  ctx.fillStyle = side; ctx.fillRect(0, 0, W, H);
  const bottom = ctx.createLinearGradient(0, H * 0.5, 0, H);
  bottom.addColorStop(0, "rgba(7,12,15,0)"); bottom.addColorStop(1, "rgba(7,12,15,0.5)");
  ctx.fillStyle = bottom; ctx.fillRect(0, 0, W, H);

  // etiqueta
  const tag = kind === "start" ? t.live : kind === "win" ? t.victory : t.defeat;
  const color = kind === "start" ? RED : kind === "win" ? GREEN : RED;
  ctx.font = '26px "Sora Bold"';
  const tw = ctx.measureText(tag).width;
  const x0 = 56, y0 = 60, ph = 54, pw = tw + 22 * 2 + 24 + 12;
  roundRect(ctx, x0, y0, pw, ph, ph / 2);
  ctx.fillStyle = color + "40"; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = color; ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x0 + 22 + 12, y0 + ph / 2, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#FFFFFF"; ctx.textBaseline = "middle";
  ctx.fillText(tag, x0 + 22 + 24 + 12, y0 + ph / 2 + 1);

  // nombre, línea principal y línea de cola/campeón
  ctx.textBaseline = "alphabetic";
  const name = String(p.n || "").slice(0, 24) || "Kairo";
  ctx.fillStyle = "#FFFFFF";
  fit(ctx, name, "Sora Bold", 70, 860);
  ctx.fillText(name, 56, 200);

  if (kind === "start") {
    ctx.fillStyle = "#C8D2DE";
    ctx.font = '40px "Sora Semi"';
    ctx.fillText(t.inGame, 56, 268);
  } else {
    ctx.fillStyle = "#FFFFFF";
    ctx.font = '92px "Sora Bold"';
    ctx.fillText(String(p.kda || "").replace(/\//g, " / "), 56, 300);
  }
  ctx.fillStyle = "#BECAD8";
  const line = [queue, champ].filter(Boolean).join("  ·  ");
  fit(ctx, line, "Sora Semi", 32, 860);
  ctx.fillText(line, 56, kind === "start" ? 322 : 392);

  ctx.fillStyle = GOLD;
  ctx.font = '22px "Sora Bold"';
  ctx.fillText("KAIRO", 56, 470);

  return canvas.encode("png");
}

// Caché de imágenes ya compuestas (las mismas se piden varias veces: un aviso llega a varios dispositivos)
const rendered = new Map();
async function bannerFor(qs, params) {
  if (rendered.has(qs)) return rendered.get(qs);
  const png = await renderBanner(params);
  if (rendered.size >= 60) rendered.delete(rendered.keys().next().value);
  rendered.set(qs, png);
  return png;
}

module.exports = { bannerUrl, verify, bannerFor, renderBanner, canonical, sign };
