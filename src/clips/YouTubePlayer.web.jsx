import React, { useEffect, useMemo, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { PLAYER_CROP, playerHtml } from "./api";

/**
 * Reproductor de un Short en la web: el mismo reproductor de YouTube dentro de un iframe (srcDoc). Igual que en el
 * celular, no recibe toques; play / pausa / sonido se mandan con postMessage.
 *  - videoId, playing, muted, onEvent
 */
export default function YouTubePlayer({ videoId, playing, muted, onEvent }) {
  const frame = useRef(null);
  const html = useMemo(() => playerHtml(videoId, muted), [videoId]);
  const send = cmd => frame.current?.contentWindow?.postMessage(JSON.stringify({ cmd }), "*");
  useEffect(() => { send(playing ? "play" : "pause"); }, [playing]);
  useEffect(() => { send(muted ? "mute" : "unmute"); }, [muted]);
  useEffect(() => {
    const onMessage = e => {
      if (e.source !== frame.current?.contentWindow) return;
      try { onEvent?.(JSON.parse(e.data)); } catch {}
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onEvent]);
  return (
    <View style={styles.crop} pointerEvents="none">
      {React.createElement("iframe", {
        ref: frame,
        srcDoc: html,
        allow: "autoplay; encrypted-media; picture-in-picture",
        style: { border: 0, width: "100%", height: "100%", pointerEvents: "none" },
        title: "YouTube",
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  crop: { position: "absolute", left: -PLAYER_CROP.side, right: -PLAYER_CROP.side, top: -PLAYER_CROP.top, bottom: -PLAYER_CROP.bottom },
});
