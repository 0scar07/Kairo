import React, { useEffect, useRef, useState } from "react";
import { View, Text, Image, StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  Easing, runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue,
  withDelay, withRepeat, withSequence, withSpring, withTiming,
} from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Stop, Circle } from "react-native-svg";
import * as SplashScreen from "expo-splash-screen";
import { APP_NAME, APP_TAGLINE } from "../constants/config";
import {
  accents, colors, fonts, fontSizes, radii, sizes, spacing, tracking, glow,
} from "../theme";

const ACCENT = accents.brand;
const FADE_OUT_MS = 450;

// Animación de entrada de un elemento: fade + desplazamiento hacia arriba
function useEnter() {
  const p = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: (1 - p.value) * spacing.md }],
  }));
  const play = delay => {
    p.value = withDelay(delay, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
  };
  return [style, play];
}

/**
 * Pantalla de carga animada. Cubre la app mientras arranca y se desvanece al llegar a 100 %.
 *  - progress: shared value 0..1 con el avance real del arranque
 *  - textsReady: las fuentes ya cargaron (el texto espera a tenerlas para no parpadear)
 *  - finished: el arranque terminó; hace fade-out y avisa con onHidden
 */
export default function LoadingScreen({ progress, textsReady, finished, onHidden }) {
  const { width, height } = useWindowDimensions();
  const [pct, setPct] = useState(0);
  const started = useRef(false);

  const screenOpacity = useSharedValue(1);
  const logoOpacity   = useSharedValue(0);
  const logoScale     = useSharedValue(0.85);
  const glowIn        = useSharedValue(0);
  const glowPulse     = useSharedValue(1);
  const [nameStyle,    playName]    = useEnter();
  const [taglineStyle, playTagline] = useEnter();
  const [barStyle,     playBar]     = useEnter();

  // El splash nativo se oculta cuando esta pantalla ya está dibujada: mismo fondo y mismo logo centrado
  function onLayout() {
    if (started.current) return;
    started.current = true;
    try { SplashScreen.setOptions({ duration: 300, fade: true }); } catch (e) { /* opciones no disponibles */ }
    SplashScreen.hideAsync().catch(() => {});

    logoOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    // Escala 0.85 → 1 con un leve rebote
    logoScale.value   = withSpring(1, { damping: 9, stiffness: 140, mass: 0.8 });
    glowIn.value      = withDelay(150, withTiming(1, { duration: 900 }));
    glowPulse.value   = withDelay(1100, withRepeat(
      withSequence(withTiming(0.72, { duration: 1400 }), withTiming(1, { duration: 1400 })), -1
    ));
  }

  useEffect(() => {
    if (!textsReady) return;
    playName(250);
    playTagline(450);
    playBar(650);
  }, [textsReady]);

  useAnimatedReaction(
    () => Math.round(progress.value * 100),
    (v, prev) => { if (v !== prev) runOnJS(setPct)(v); }
  );

  useEffect(() => {
    if (!finished) return;
    screenOpacity.value = withTiming(0, { duration: FADE_OUT_MS, easing: Easing.inOut(Easing.quad) }, done => {
      if (done) runOnJS(onHidden)();
    });
  }, [finished]);

  const rootStyle  = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const logoStyle  = useAnimatedStyle(() => ({ opacity: logoOpacity.value, transform: [{ scale: logoScale.value }] }));
  const glowStyle  = useAnimatedStyle(() => ({ opacity: glowIn.value * glowPulse.value }));
  const fillStyle  = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const centerY = height / 2;

  return (
    <Animated.View style={[styles.root, rootStyle]} onLayout={onLayout} pointerEvents={finished ? "none" : "auto"}>
      {/* Resplandor radial suave detrás del logo */}
      <Animated.View
        pointerEvents="none"
        style={[styles.glow, { top: centerY - sizes.splashGlow / 2, left: (width - sizes.splashGlow) / 2 }, glowStyle]}
      >
        <Svg width={sizes.splashGlow} height={sizes.splashGlow}>
          <Defs>
            <RadialGradient id="kairoGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%"   stopColor={ACCENT} stopOpacity="0.28" />
              <Stop offset="45%"  stopColor={ACCENT} stopOpacity="0.09" />
              <Stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="50%" cy="50%" r="50%" fill="url(#kairoGlow)" />
        </Svg>
      </Animated.View>

      {/* Logo: en el mismo punto y tamaño que el splash nativo */}
      <Animated.View pointerEvents="none" style={[styles.logoWrap, { top: centerY - sizes.splashLogo / 2 }, logoStyle]}>
        <Image source={require("../../assets/splash-icon.png")} style={styles.logo} />
      </Animated.View>

      <View pointerEvents="none" style={[styles.textBlock, { top: centerY + sizes.splashLogo * 0.32 + spacing.xl }]}>
        <Animated.Text style={[styles.name, nameStyle]}>{APP_NAME.toUpperCase()}</Animated.Text>
        <Animated.Text style={[styles.tagline, taglineStyle]}>{APP_TAGLINE.toUpperCase()}</Animated.Text>

        <Animated.View style={[styles.barBlock, barStyle]}>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, glow(ACCENT, spacing.sm, 0.9), fillStyle]} />
          </View>
          <Text style={styles.percent}>{pct} %</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root:      { ...StyleSheet.absoluteFillObject, backgroundColor: colors.bg },
  glow:      { position: "absolute", width: sizes.splashGlow, height: sizes.splashGlow },
  logoWrap:  { position: "absolute", left: 0, right: 0, alignItems: "center" },
  logo:      { width: sizes.splashLogo, height: sizes.splashLogo },
  textBlock: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  // paddingLeft compensa el espacio que deja el letter-spacing tras la última letra
  name:      {
    fontFamily: fonts.displayHeavy, fontSize: fontSizes.hero, color: colors.text,
    letterSpacing: tracking.brand, paddingLeft: tracking.brand,
  },
  tagline:   {
    fontFamily: fonts.bodyMedium, fontSize: fontSizes.xxs, color: colors.textMuted,
    letterSpacing: tracking.widest, paddingLeft: tracking.widest, marginTop: spacing.sm,
  },
  barBlock:  { alignItems: "center", marginTop: spacing.xl },
  track:     {
    width: sizes.splashBar, height: sizes.barSplash, borderRadius: radii.pill,
    backgroundColor: colors.surfaceHigh,
  },
  fill:      { height: "100%", borderRadius: radii.pill, backgroundColor: ACCENT },
  percent:   {
    fontFamily: fonts.bodyMedium, fontSize: fontSizes.xxs, color: colors.textMuted,
    letterSpacing: tracking.wide, marginTop: spacing.md,
  },
});
