import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { PressableScale } from "../components/ui";
import Icon from "../components/Icon";
import { select } from "../utils/haptics";
import { colors, radii, sizes, spacing, fontSizes, type, withAlpha } from "../theme";

const STEP = 30;   // minutos

// "HH:MM" <-> minutos del día
const toMinutes = hhmm => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const toText = minutes => {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
};

function StepButton({ icon, onPress, name, accent }) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.85}
      hitSlop={spacing.sm}
      accessibilityLabel={name}
      style={[styles.button, { borderColor: withAlpha(accent, 0.4), backgroundColor: withAlpha(accent, 0.1) }]}
    >
      <Icon name={icon} size={fontSizes.base} color={accent} />
    </PressableScale>
  );
}

// Selector de hora sencillo: – y + mueven de 30 en 30 minutos (sin dependencias de calendario del sistema)
export default function TimeStepper({ label, value, onChange, accent }) {
  const move = delta => { select(); onChange(toText(toMinutes(value) + delta)); };
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.control}>
        <StepButton icon="minus" onPress={() => move(-STEP)} name={`${label} -${STEP} min`} accent={accent} />
        <Text style={styles.time}>{value}</Text>
        <StepButton icon="plus" onPress={() => move(STEP)} name={`${label} +${STEP} min`} accent={accent} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  label:   { ...type.bodyMedium, fontSize: fontSizes.base, color: colors.textSecondary },
  control: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  button:  { width: sizes.avatarSm, height: sizes.avatarSm, borderRadius: radii.pill, borderWidth: sizes.hairline, alignItems: "center", justifyContent: "center" },
  time:    { ...type.stat, fontSize: fontSizes.lg, color: colors.text, minWidth: sizes.avatarHero - spacing.xl, textAlign: "center" },
});
