import React from "react";
import { useT } from "../../i18n/I18nProvider";
import { Text, TouchableOpacity, StyleSheet } from "react-native";
import Icon from "../Icon";
import { colors, radii, sizes, spacing, fontSizes, type, useAccent, withAlpha } from "../../theme";

// Botón "cargar más": se desactiva mientras carga o cuando ya no hay más
export default function LoadMoreButton({ loading, hasMore, onPress, game }) {
  const t = useT();
  const accent = useAccent(game);
  const disabled = loading || !hasMore;
  return (
    <TouchableOpacity
      style={[styles.btn, { borderColor: withAlpha(accent, 0.4) }, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {!loading && hasMore ? <Icon name="arrowDown" size={fontSizes.base} color={accent} /> : null}
      <Text style={[styles.text, { color: accent }]}>
        {loading ? t("matches.loading") : hasMore ? t("matches.loadMore") : t("matches.noMore")}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    marginTop: spacing.md, padding: spacing.lg,
    backgroundColor: colors.surface, borderWidth: sizes.hairline,
    borderRadius: radii.md, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: spacing.sm,
  },
  text:     { ...type.bodyStrong },
  disabled: { opacity: 0.5 },
});
