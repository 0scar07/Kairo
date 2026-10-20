import React from "react";
import { View, Text, Image, Modal, Pressable, Share, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut, ZoomIn } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import Icon from "../components/Icon";
import { GamePill, Shade } from "./components";
import { fmtNewsDate, imageOf } from "./api";
import { useT } from "../i18n/I18nProvider";
import { tap } from "../utils/haptics";
import { colors, fontSizes, radii, sizes, spacing, type, withAlpha } from "../theme";

/**
 * Vista previa al mantener presionada una noticia (como en iPhone): el fondo se desenfoca, la noticia sale flotando con
 * su resumen y debajo aparece un menú de vidrio para leer, guardar en Mi lista, compartir o abrir la web oficial.
 *  - item (o null para cerrar), saved, onRead, onToggleSave, onOpenWeb, onClose
 */
export default function PeekOverlay({ item, saved, onRead, onToggleSave, onOpenWeb, onClose }) {
  const t = useT();
  if (!item) return null;
  const actions = [
    { key: "read", label: item.article ? t("news.read") : t("news.open"), icon: "chevron", run: onRead },
    { key: "save", label: saved ? t("news.removeList") : t("news.saveList"), icon: saved ? "check" : "plus", run: onToggleSave },
    { key: "share", label: t("news.share"), icon: "share", run: () => Share.share({ message: [item.title, item.url].filter(Boolean).join("\n") }).catch(() => {}) },
    ...(item.url && item.article ? [{ key: "web", label: t("news.viewOfficial"), icon: "send", run: onOpenWeb }] : []),
  ];
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(160)} style={StyleSheet.absoluteFill}>
        <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill} />
        <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={onClose} accessibilityRole="button" accessibilityLabel={t("news.back")} />
        <View style={styles.center} pointerEvents="box-none">
          <Animated.View entering={ZoomIn.springify().damping(15)} style={styles.card}>
            <View style={styles.image}>
              {imageOf(item) ? <Image source={{ uri: imageOf(item) }} style={StyleSheet.absoluteFill} resizeMode={item.kind === "champion" ? "contain" : "cover"} /> : null}
              <Shade from={0} mid={0.2} to={1} />
            </View>
            <View style={styles.body}>
              <GamePill game={item.game} solid />
              <Text style={styles.title} numberOfLines={3}>{item.title}</Text>
              {item.summary ? <Text style={styles.summary} numberOfLines={4}>{item.summary}</Text> : null}
              {item.date ? <Text style={styles.date}>{fmtNewsDate(item.date)}</Text> : null}
            </View>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(90).duration(260)} style={styles.menu}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            {actions.map((a, i) => (
              <Pressable
                key={a.key}
                onPress={() => { tap(); a.run?.(); }}
                style={({ pressed }) => [styles.action, i > 0 && styles.sep, pressed && styles.actionPressed]}
                accessibilityRole="button"
              >
                <Text style={styles.actionText}>{a.label}</Text>
                <Icon name={a.icon} size={fontSizes.base} color={colors.text} />
              </Pressable>
            ))}
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop:      { backgroundColor: withAlpha(colors.bg, 0.35) },
  center:        { flex: 1, justifyContent: "center", paddingHorizontal: spacing.xl, gap: spacing.md },
  card:          { borderRadius: radii.xl, overflow: "hidden", backgroundColor: colors.surfaceRaised, borderWidth: sizes.hairline, borderColor: withAlpha(colors.text, 0.12), boxShadow: `0 30px 60px ${withAlpha(colors.bg, 0.7)}` },
  image:         { height: sizes.chart * 1.6, backgroundColor: colors.surfaceHigh },
  body:          { padding: spacing.md, paddingTop: 0, gap: spacing.xs },
  title:         { ...type.heading, color: colors.text, marginTop: spacing.xs },
  summary:       { ...type.caption, color: colors.textSecondary },
  date:          { ...type.micro, color: colors.textMuted },
  menu:          { marginHorizontal: spacing.xl, borderRadius: radii.lg, overflow: "hidden", backgroundColor: withAlpha(colors.surfaceHigh, 0.7), borderWidth: sizes.hairline, borderColor: withAlpha(colors.text, 0.1) },
  action:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  actionPressed: { backgroundColor: withAlpha(colors.text, 0.1) },
  actionText:    { ...type.bodyStrong, color: colors.text },
  sep:           { borderTopWidth: sizes.hairline, borderTopColor: withAlpha(colors.text, 0.08) },
});
