import React, { useRef, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import PressableScale from "./PressableScale";
import { select } from "../../utils/haptics";
import { colors, radii, sizes, spacing, fontSizes, type, useAccent } from "../../theme";

const SPRING = { damping: 20, stiffness: 240, mass: 0.7 };

// tabs: [{ key, label }]. Pestañas subrayadas: una línea del acento del juego se desliza bajo la activa.
// scroll: si no caben a lo ancho, se desplazan de lado (la línea de abajo sigue a la activa y la fila la centra)
export default function SegmentedTabs({ tabs, value, onChange, game, scroll = false }) {
  const accent = useAccent(game);
  const [layouts, setLayouts] = useState({});   // key -> { x, width } de cada pestaña
  const active = layouts[value];
  const scroller = useRef(null);
  const [viewWidth, setViewWidth] = useState(0);

  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const indicator = useAnimatedStyle(() => ({ width: w.value, transform: [{ translateX: x.value }] }));

  React.useEffect(() => {
    if (!active) return;
    x.value = withSpring(active.x, SPRING);
    w.value = withSpring(active.width, SPRING);
    if (scroll && viewWidth) scroller.current?.scrollTo({ x: Math.max(0, active.x + active.width / 2 - viewWidth / 2), animated: true });
  }, [active?.x, active?.width, viewWidth]);

  const row = (
    <View style={[styles.wrap, scroll && styles.wrapScroll]} accessibilityRole="tablist">
      {tabs.map(t => {
        const on = t.key === value;
        return (
          <PressableScale
            key={t.key}
            scaleTo={0.96}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onLayout={e => { const { x: lx, width } = e.nativeEvent.layout; setLayouts(prev => ({ ...prev, [t.key]: { x: lx, width } })); }}
            onPress={() => { if (!on) { select(); onChange(t.key); } }}
          >
            <Text style={[styles.text, on && styles.textOn]} maxFontSizeMultiplier={1.4} numberOfLines={1}>{t.label}</Text>
          </PressableScale>
        );
      })}
      {active ? <Animated.View style={[styles.indicator, { backgroundColor: accent }, indicator]} /> : null}
    </View>
  );
  if (!scroll) return row;
  return (
    <ScrollView
      ref={scroller}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={e => setViewWidth(e.nativeEvent.layout.width)}
      style={styles.scroller}
      contentContainerStyle={styles.scrollContent}
    >
      {row}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap:      {
    flexDirection: "row", gap: spacing.xl, marginBottom: spacing.lg,
    borderBottomWidth: sizes.hairline, borderBottomColor: colors.border,
  },
  wrapScroll:   { marginBottom: 0, borderBottomWidth: 0, minWidth: "100%" },
  scroller:     { marginBottom: spacing.lg, borderBottomWidth: sizes.hairline, borderBottomColor: colors.border, flexGrow: 0 },
  scrollContent:{ flexGrow: 1 },
  tab:       { minHeight: sizes.placement + spacing.xs, justifyContent: "center", paddingTop: spacing.xs },
  text:      { ...type.bodyStrong, fontSize: fontSizes.base, color: colors.textMuted },
  textOn:    { color: colors.text },
  indicator: { position: "absolute", left: 0, bottom: -sizes.hairline, height: sizes.barThin, borderTopLeftRadius: radii.xs, borderTopRightRadius: radii.xs },
});
