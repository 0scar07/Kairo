import React, { useEffect, useMemo, useRef } from "react";
import { PanResponder, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GlassBackdrop from "./GlassBackdrop";
import { CHIP_H, CHIP_W, COMPACT_H, COMPACT_W, DROP, FULL_H, chipScale, chipTop, fullWidth } from "./geometry";
import LiveCapsule from "../LiveCapsule";
import Icon from "../../components/Icon";
import { useT } from "../../i18n/I18nProvider";
import { success } from "../../utils/haptics";
import { accents, colors, fontSizes, type } from "../../theme";

const HOLD_MS = 5000;        // cuánto se queda visible antes de guardarse
const RESUME_MS = 2200;      // al soltar tras mantener presionado, tiempo que queda
const ROLL = { damping: 12, stiffness: 190, mass: 0.8 };            // brotar / caer
const STRETCH = { damping: 15, stiffness: 210, mass: 0.85 };        // de gota a cápsula
const EXPAND = { damping: 11, stiffness: 150, mass: 0.9 };          // ancho completo, con rebote
const CHIP = { damping: 13, stiffness: 170, mass: 0.8 };

/**
 * Banner "fluido" de partida en vivo. Nace como una gota bajo la barra de estado, se estira en cápsula, se expande con
 * rebote mientras el texto pasa de borroso a nítido, y de su borde inferior brota el chip "Ver partida". Pasado un rato
 * el chip se reabsorbe, la cápsula se encoge a gota y sube. Toda la animación corre en el hilo de UI (Reanimated).
 *
 * Gestos: tocar abre la partida, deslizar hacia arriba lo cierra y mantener presionado pausa el cierre automático.
 * item: { id, name, heading, subtitle, avatarUri, badgeUri, live, data }
 */
export default function FluidBanner({ item, onDone, onOpen }) {
  const t = useT();
  const { width: screenW } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const accent = accents.lol;
  const fullW = fullWidth(screenW);
  const top = insets.top + 8;
  const canvasH = top + FULL_H + CHIP_H + 40;

  // Valores compartidos de la animación (ver geometry.js)
  const pw = useSharedValue(DROP);
  const ph = useSharedValue(DROP);
  const py = useSharedValue(top - 34);
  const chip = useSharedValue(0);
  const alpha = useSharedValue(0);
  const blur = useSharedValue(10);
  const textOpacity = useSharedValue(0);
  const geo = useMemo(() => ({ pw, ph, py, chip, alpha }), []);

  const timers = useRef([]);
  const closing = useRef(false);
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.current.push(id); return id; };
  const holdTimer = useRef(null);

  function dismiss() {
    if (closing.current) return;
    closing.current = true;
    clearTimeout(holdTimer.current);
    timers.current.forEach(clearTimeout);
    timers.current = [];
    // El chip se reabsorbe, la cápsula se encoge a gota y la gota sube y se funde arriba
    chip.value = withTiming(0, { duration: 260, easing: Easing.in(Easing.quad) });
    textOpacity.value = withDelay(80, withTiming(0, { duration: 160 }));
    blur.value = withDelay(80, withTiming(8, { duration: 200 }));
    later(() => { pw.value = withSpring(COMPACT_W, STRETCH); ph.value = withSpring(COMPACT_H, STRETCH); }, 220);
    later(() => { pw.value = withSpring(DROP, STRETCH); ph.value = withSpring(DROP, STRETCH); }, 560);
    later(() => { py.value = withSpring(top - 40, ROLL); alpha.value = withDelay(60, withTiming(0, { duration: 180 })); }, 720);
    later(onDone, 1050);
  }

  function armHold(ms) {
    clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(dismiss, ms);
  }

  useEffect(() => {
    // 1. brota la gota  2. se estira en cápsula compacta  3. se expande con rebote y el texto se aclara  4. brota el chip
    alpha.value = withTiming(1, { duration: 120 });
    py.value = withSpring(top, ROLL);
    pw.value = withDelay(230, withSpring(COMPACT_W, STRETCH));
    ph.value = withDelay(230, withSpring(COMPACT_H, STRETCH));
    textOpacity.value = withDelay(380, withTiming(1, { duration: 260 }));
    later(() => {
      pw.value = withSpring(fullW, EXPAND);
      ph.value = withSpring(FULL_H, EXPAND);
      blur.value = withTiming(0, { duration: 520, easing: Easing.out(Easing.cubic) });
    }, 640);
    later(() => success(), 980);
    later(() => { chip.value = withSpring(1, CHIP); }, 1300);
    later(() => armHold(HOLD_MS), 1300);
    return () => { timers.current.forEach(clearTimeout); clearTimeout(holdTimer.current); };
  }, []);

  // Deslizar hacia arriba cierra el banner
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => g.dy < -6 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderRelease: (_e, g) => { if (g.dy < -18) dismiss(); },
  }), []);

  function open() {
    onOpen(item);
    dismiss();
  }

  const capsuleStyle = useAnimatedStyle(() => ({
    left: (screenW - pw.value) / 2, top: py.value, width: pw.value, height: ph.value, borderRadius: ph.value / 2, opacity: alpha.value,
  }));
  const contentStyle = useAnimatedStyle(() => (
    Platform.OS === "web"
      ? { opacity: textOpacity.value, filter: `blur(${blur.value}px)` }
      : { opacity: textOpacity.value, filter: [{ blur: blur.value }] }
  ));
  const chipTouch = useAnimatedStyle(() => {
    const s = chipScale(chip.value);
    return {
      left: (screenW - CHIP_W * s) / 2, top: chipTop(py.value, ph.value, chip.value), width: CHIP_W * s, height: CHIP_H * s,
      opacity: Math.max(0, (chip.value - 0.35) / 0.65) * alpha.value,
    };
  });

  return (
    <View style={[styles.layer, { height: canvasH }]} pointerEvents="box-none">
      <GlassBackdrop geo={geo} width={screenW} height={canvasH} accent={accent} />

      <Animated.View style={[styles.capsule, capsuleStyle]} {...pan.panHandlers}>
        <Pressable
          style={styles.press}
          onPress={open}
          onLongPress={() => clearTimeout(holdTimer.current)}
          onPressOut={() => { if (!closing.current) armHold(RESUME_MS); }}
          accessibilityRole="button"
          accessibilityLabel={`${item.heading}. ${item.subtitle}`}
        >
          <Animated.View style={[{ width: fullW, paddingHorizontal: 14 }, contentStyle]}>
            <LiveCapsule
              name={item.heading}
              time={item.live ? t("notif.now") : null}
              subtitle={item.subtitle}
              live={item.live}
              avatarUri={item.avatarUri}
              badgeUri={item.badgeUri}
              accent={accent}
            />
          </Animated.View>
        </Pressable>
      </Animated.View>

      <Animated.View style={[styles.chip, chipTouch]}>
        <Pressable style={styles.chipPress} onPress={open} accessibilityRole="button" accessibilityLabel={t("notif.banner.view")}>
          <Icon name="eye" size={fontSizes.lg} color={colors.text} />
          <Text style={styles.chipText} numberOfLines={1}>{t("notif.banner.view")}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer:     { position: "absolute", left: 0, right: 0, top: 0, zIndex: 50, elevation: 50 },
  capsule:   { position: "absolute", overflow: "hidden" },
  press:     { flex: 1, justifyContent: "center" },
  chip:      { position: "absolute", overflow: "hidden" },
  chipPress: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  chipText:  { ...type.smallStrong, color: colors.text },
});
