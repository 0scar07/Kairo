import * as Haptics from "expo-haptics";

// La háptica es un extra: si el dispositivo no la soporta (web, algunos Android) simplemente no vibra.
let enabled = true;

export const setHapticsEnabled = value => { enabled = !!value; };
export const isHapticsEnabled = () => enabled;

const run = fn => { if (enabled) fn().catch(() => { /* sin soporte: se ignora a propósito */ }); };

export const tap     = () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
export const select  = () => run(() => Haptics.selectionAsync());
export const success = () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
