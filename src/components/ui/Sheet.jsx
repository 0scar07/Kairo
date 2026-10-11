import React, { useEffect, useMemo, useState } from "react";
import { Modal, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Glass from "./Glass";
import { useT } from "../../i18n/I18nProvider";
import { colors, radii, sizes, spacing, type } from "../../theme";

const SPRING = { damping: 24, stiffness: 260, mass: 0.9 };

/**
 * Hoja inferior al estilo iOS: sube desde abajo, tiene asa y se cierra deslizándola hacia abajo,
 * tocando fuera o con el botón atrás de Android.
 *  - visible / onClose: controlada por el padre
 *  - title: título opcional bajo el asa
 */
export default function Sheet({ visible, onClose, title, children }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const y = useSharedValue(height);
  const shade = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      y.value = height;
      y.value = withSpring(0, SPRING);
      shade.value = withTiming(1, { duration: 250 });
    } else if (mounted) {
      shade.value = withTiming(0, { duration: 200 });
      y.value = withTiming(height, { duration: 220, easing: Easing.in(Easing.cubic) }, done => {
        if (done) runOnJS(setMounted)(false);
      });
    }
  }, [visible]);

  // Arrastrar el asa (o el título) hacia abajo cierra la hoja
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderMove: (_, g) => { y.value = Math.max(0, g.dy); },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 110 || g.vy > 1) onClose();
      else y.value = withSpring(0, SPRING);
    },
    onPanResponderTerminate: () => { y.value = withSpring(0, SPRING); },
  }), [onClose]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const shadeStyle = useAnimatedStyle(() => ({ opacity: shade.value }));

  if (!mounted) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, styles.shade, shadeStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={t("common.close")} />
      </Animated.View>
      <Animated.View style={[styles.sheet, { maxHeight: height * 0.88, paddingBottom: insets.bottom + spacing.lg }, sheetStyle]} accessibilityViewIsModal>
        <Glass style={StyleSheet.absoluteFill} intensity={80} fill={0.6} />
        <View {...pan.panHandlers} style={styles.handleArea}>
          <View style={styles.grabber} />
          {title ? <Text style={styles.title} accessibilityRole="header">{title}</Text> : null}
        </View>
        {children}
      </Animated.View>
    </Modal>
  );
}

// Fila de acción para hojas y menús contextuales
export function SheetAction({ label, icon, onPress, destructive, selected, detail }) {
  const color = destructive ? colors.loss : colors.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={selected != null ? { selected } : undefined}
      style={({ pressed }) => [styles.action, pressed && styles.actionPressed, selected && styles.actionSelected]}
    >
      {icon}
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
      {detail ? <Text style={styles.actionDetail}>{detail}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shade:      { backgroundColor: colors.overlay },
  sheet:      {
    position: "absolute", left: 0, right: 0, bottom: 0, overflow: "hidden",
    borderTopLeftRadius: radii.xl + spacing.sm, borderTopRightRadius: radii.xl + spacing.sm,
    borderWidth: sizes.hairline, borderBottomWidth: 0, borderColor: colors.borderStrong,
    paddingHorizontal: spacing.lg,
  },
  handleArea: { alignItems: "center", paddingTop: spacing.sm, paddingBottom: spacing.md },
  grabber:    { width: spacing.xxxl - spacing.md, height: spacing.xs + 1, borderRadius: radii.pill, backgroundColor: colors.borderStrong, marginBottom: spacing.md },
  title:      { ...type.heading, color: colors.text, alignSelf: "flex-start" },
  action:     {
    flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: sizes.placement + spacing.xs,
    paddingHorizontal: spacing.md, borderRadius: radii.md,
  },
  actionPressed:  { backgroundColor: colors.surfaceHigh },
  actionSelected: { backgroundColor: colors.surfaceRaised },
  actionLabel:    { ...type.body, flex: 1 },
  actionDetail:   { ...type.small, color: colors.textMuted },
});
