import React, { useState } from "react";
import { useT } from "../i18n/I18nProvider";
import { View, Text, Modal, Pressable, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Chip } from "./ui";
import { REGIONS, regionName } from "../constants/regions";
import { colors, radii, sizes, spacing, fontSizes, type, useAccent, withAlpha } from "../theme";

// Botón con la región actual que abre una lista para elegir otra
export function RegionButton({ value, onChange, disabled, options = REGIONS, nameOf = regionName, title, label }) {
  const t = useT();
  const accent = useAccent();
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.button, { borderColor: colors.border }]}
        onPress={() => setOpen(true)}
        disabled={disabled}
        activeOpacity={0.8}
        accessibilityLabel={label || t("region.choose")}
      >
        <Text style={[styles.buttonText, { color: accent }]}>{(options.find(o => o.id === value) || options[0]).label}</Text>
        <Text style={styles.caret}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.title}>{(title || t("region.title")).toUpperCase()}</Text>
            {options.map(r => {
              const active = r.id === value;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.option, active && { backgroundColor: withAlpha(accent, 0.12) }]}
                  onPress={() => { onChange(r.id); setOpen(false); }}
                >
                  <Text style={[styles.optionLabel, active && { color: accent }]}>{r.label}</Text>
                  {nameOf ? <Text style={styles.optionName}>{nameOf(r.id)}</Text> : null}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// Selector en línea (chips desplazables), para formularios
export function RegionChips({ value, onChange, game, options = REGIONS }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
      {options.map(r => (
        <Chip key={r.id} label={r.label} active={r.id === value} game={game} onPress={() => onChange(r.id)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  button:      {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    paddingHorizontal: spacing.md, borderRadius: radii.md,
    backgroundColor: colors.surface, borderWidth: sizes.hairline, justifyContent: "center",
  },
  buttonText:  { ...type.label, fontSize: fontSizes.sm },
  caret:       { ...type.caption, color: colors.textMuted },
  overlay:     { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: spacing.xl },
  sheet:       {
    backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.lg,
    borderWidth: sizes.hairline, borderColor: colors.border,
  },
  title:       { ...type.label, color: colors.textMuted, marginBottom: spacing.md },
  option:      {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: radii.md,
  },
  optionLabel: { ...type.label, fontSize: fontSizes.sm, color: colors.text, minWidth: spacing.xxxl },
  optionName:  { ...type.small, color: colors.textSecondary },
  chips:       { marginBottom: spacing.md },
});
