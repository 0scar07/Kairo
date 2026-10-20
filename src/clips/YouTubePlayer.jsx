import React, { useEffect, useMemo, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { PLAYER_CROP, playerHtml } from "./api";

// La librería se carga solo si este APK la trae (ver hasWebView): en APKs viejos, importarla rompería la app
let WebView = null;
function loadWebView() {
  if (!WebView) WebView = require("react-native-webview").WebView;
  return WebView;
}

/**
 * Reproductor de un Short de YouTube con el reproductor oficial incrustado (react-native-webview). No recibe toques:
 * los gestos (deslizar, tocar, doble toque) los maneja el visor encima.
 *  - videoId, playing, muted, onEvent({ t: "ready" | "time" | "state" | "error", ... })
 */
export default function YouTubePlayer({ videoId, playing, muted, onEvent }) {
  const Web = loadWebView();
  const ref = useRef(null);
  // La página se arma una vez por video (con el sonido inicial); luego se manda play / pausa / sonido
  const html = useMemo(() => playerHtml(videoId, muted), [videoId]);
  const send = c => ref.current?.injectJavaScript(`window.cmd && window.cmd("${c}"); true;`);
  useEffect(() => { send(playing ? "play" : "pause"); }, [playing]);
  useEffect(() => { send(muted ? "mute" : "unmute"); }, [muted]);
  return (
    <View style={styles.crop} pointerEvents="none">
      <Web
        ref={ref}
        source={{ html, baseUrl: "https://0scar07.github.io/Kairo/" }}   // YouTube pide un origen https para incrustar
        style={styles.web}
        originWhitelist={["*"]}
        javaScriptEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        setSupportMultipleWindows={false}
        onMessage={e => { try { onEvent?.(JSON.parse(e.nativeEvent.data)); } catch {} }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  crop: { position: "absolute", left: -PLAYER_CROP.side, right: -PLAYER_CROP.side, top: -PLAYER_CROP.top, bottom: -PLAYER_CROP.bottom },
  web:  { flex: 1, backgroundColor: "transparent" },
});
