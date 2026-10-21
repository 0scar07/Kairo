import { NativeModules, Platform, TurboModuleRegistry, UIManager } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../api/client";

// Clips: los Shorts oficiales de YouTube de cada juego (ver server/routes/clips.js)
const TTL = 10 * 60 * 1000;
let cached = null;   // { at, promise }: la lista se comparte entre la pestaña y el visor
export function getClips(force) {
  if (!force && cached && Date.now() - cached.at < TTL) return cached.promise;
  const promise = api.get("/clips").then(r => r.data.items || []);
  cached = { at: Date.now(), promise };
  promise.catch(() => { cached = null; });
  return promise;
}

/**
 * ¿Este APK trae el reproductor nativo (react-native-webview)? Las actualizaciones por aire llegan también a APKs
 * anteriores, que no lo tienen: ahí los clips se abren en YouTube en vez de reproducirse dentro de Kairo.
 */
let webviewReady = null;
export function hasWebView() {
  if (Platform.OS === "web") return true;   // en la web se usa un iframe
  if (webviewReady == null) {
    try {
      webviewReady = Boolean(
        TurboModuleRegistry?.get?.("RNCWebViewModule") || NativeModules.RNCWebViewModule || NativeModules.RNCWebView
        || UIManager.getViewManagerConfig?.("RNCWebView"),
      );
    } catch { webviewReady = false; }
  }
  return webviewReady;
}

// El sonido arranca apagado (como en TikTok en público); si lo activas, se recuerda
const SOUND_KEY = "kairo_clips_sound";
export async function loadSound() { try { return (await AsyncStorage.getItem(SOUND_KEY)) === "on"; } catch { return false; } }
export const saveSound = on => AsyncStorage.setItem(SOUND_KEY, on ? "on" : "off").catch(() => {});

/**
 * Los Shorts incrustados traen su propia interfaz (logo arriba; título, "me gusta" y compartir abajo). El reproductor se
 * dibuja más alto que la pantalla para que esas franjas queden fuera y solo se vean los controles de Kairo.
 */
export const PLAYER_CROP = { top: 150, bottom: 150, side: 70 };   // también más ancho: el video 9:16 llena la pantalla

/** Clip → noticia de Mi lista (comparte la lista con Noticias) */
export const clipAsItem = c => ({ id: `clip:${c.id}`, game: c.game, kind: "clip", title: c.title, date: c.date, image: c.image, url: c.url, clipId: c.id });

/** Página del reproductor de YouTube (API de iframe), que avisa del avance y obedece play / pause / sonido */
export function playerHtml(id, muted) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#p{position:absolute;inset:0;width:100%;height:100%}</style></head>
<body><div id="p"></div><script>
var send=function(m){m=JSON.stringify(m);if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(m);}else{parent.postMessage(m,"*");}};
var player;
function init(){if(player)return;player=new YT.Player("p",{videoId:"${id}",width:"100%",height:"100%",
playerVars:{autoplay:1,mute:${muted ? 1 : 0},playsinline:1,controls:0,loop:1,playlist:"${id}",rel:0,modestbranding:1,fs:0,iv_load_policy:3,disablekb:1},
events:{onReady:function(){player.playVideo();send({t:"ready"});},onStateChange:function(e){send({t:"state",s:e.data});},onError:function(e){send({t:"error",c:e.data});}}});
setInterval(function(){if(player&&player.getDuration){var d=player.getDuration();if(d){send({t:"time",c:player.getCurrentTime(),d:d});}}},250);}
window.cmd=function(c){if(!player||!player.playVideo)return;if(c==="play")player.playVideo();if(c==="pause")player.pauseVideo();if(c==="mute")player.mute();if(c==="unmute"){player.unMute();player.setVolume(100);}};
window.addEventListener("message",function(e){try{var m=typeof e.data==="string"?JSON.parse(e.data):e.data;if(m&&m.cmd)window.cmd(m.cmd);}catch(_){}});
window.onYouTubeIframeAPIReady=init;
</script><script src="https://www.youtube.com/iframe_api"></script><script>var tries=0;(function wait(){if(player)return;if(window.YT&&YT.Player&&YT.loaded){init();return;}if(++tries<60)setTimeout(wait,200);})();</script></body></html>`;
}

// ── Siguiendo: canales de YouTube que eligió el usuario (pros, streamers). Viven solo en el celular.
const FOLLOW_KEY = "kairo_clips_following";
export const MAX_FOLLOWING = 12;   // el servidor no lee más de 12 canales a la vez
const followListeners = new Set();
export function onFollowingChanged(fn) { followListeners.add(fn); return () => followListeners.delete(fn); }

export async function loadFollowing() {
  try { return JSON.parse((await AsyncStorage.getItem(FOLLOW_KEY)) || "[]"); } catch { return []; }
}
async function saveFollowing(list) {
  await AsyncStorage.setItem(FOLLOW_KEY, JSON.stringify(list));
  followingCache = null;
  followListeners.forEach(fn => { try { fn(list); } catch (e) { console.warn("Oyente de canales:", e.message); } });
  return list;
}
// Sigue o deja de seguir un canal ({ id, title, image, handle, game }). Devuelve { list, following }
export async function toggleFollowChannel(channel) {
  const list = await loadFollowing();
  const following = !list.some(c => c.id === channel.id);
  if (following && list.length >= MAX_FOLLOWING) return { list, following: false, full: true };
  const next = following ? [{ id: channel.id, title: channel.title, image: channel.image || null, handle: channel.handle || null, game: channel.game || "lol" }, ...list] : list.filter(c => c.id !== channel.id);
  return { list: await saveFollowing(next), following };
}

// Un canal por lo que pegue el usuario: "@nombre", enlace de YouTube o "UC…"
export const findChannel = text => api.get("/clips/channel", { params: { c: text } }).then(r => r.data.channel);
export const getSuggested = () => api.get("/clips/suggested").then(r => r.data.channels || []);

let followingCache = null;   // { key, at, promise }
export function getFollowingClips(list, force) {
  if (!list.length) return Promise.resolve([]);
  const key = list.map(c => c.id).join(",");
  if (!force && followingCache?.key === key && Date.now() - followingCache.at < TTL) return followingCache.promise;
  const promise = api.get("/clips/following", { params: { c: key, g: list.map(c => c.game || "lol").join(",") } })
    .then(r => (r.data.items || []).map(c => ({ ...c, channel: c.channel || list.find(f => f.id === c.channelId)?.title || null })));
  followingCache = { key, at: Date.now(), promise };
  promise.catch(() => { followingCache = null; });
  return promise;
}
