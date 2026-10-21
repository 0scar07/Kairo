import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { getEsports } from "../games/valorant/api";
import { loadFollowedTeams } from "../utils/followedTeams";
import { CHANNEL_START, getPermission } from "./push";
import { loadPrefs } from "./store";
import { t } from "../i18n";

const LEAD_MS = 15 * 60_000;   // el aviso llega 15 minutos antes del partido
const KIND = "val_match";
const MAX_AHEAD = 8;           // como mucho 8 partidos programados (Android limita las alarmas por app)

/**
 * Avisos de los partidos de los equipos de Valorant seguidos, programados en el propio celular (sin servidor), igual que
 * los de los pros de LoL (proAlerts.js): uno por partido, 15 minutos antes. Se rehace al abrir la app y al seguir o dejar
 * de seguir un equipo, así un cambio de horario se corrige solo y lo que ya no toca se cancela. En la web no hace nada.
 */
export async function syncTeamAlerts() {
  if (Platform.OS === "web") return;
  if ((await getPermission().catch(() => "denied")) !== "granted") return;

  const prefs = await loadPrefs();
  const teams = prefs.enabled && prefs.valAlerts !== false ? (await loadFollowedTeams()).filter(tm => tm.alerts !== false) : [];
  const wanted = new Map();   // identificador -> { at, content }

  if (teams.length) {
    const ids = new Set(teams.map(tm => tm.id));
    const upcoming = (await getEsports().catch(() => null))?.upcoming || [];
    for (const m of upcoming) {
      if (wanted.size >= MAX_AHEAD) break;
      const mine = (m.teams || []).filter(tm => ids.has(tm.id));
      const at = Date.parse(m.beginAt) - LEAD_MS;
      if (!mine.length || !(at > Date.now() + 60_000)) continue;
      const [a, b] = m.teams;
      wanted.set(`${KIND}-${m.id}`, {
        at,
        content: {
          title: t("teamAlerts.title", { a: a?.acronym || a?.name || "TBD", b: b?.acronym || b?.name || "TBD", minutes: LEAD_MS / 60_000 }),
          body: t("teamAlerts.body", { event: [m.serie, m.tournament].filter(Boolean).join(" · ") || "Valorant", team: mine.map(tm => tm.name).join(", ") }),
          data: { type: KIND, id: m.id },
        },
      });
    }
  }

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const mine = scheduled.filter(n => n.content?.data?.type === KIND);
  await Promise.all(mine.filter(n => !wanted.has(n.identifier)).map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  const have = new Set(mine.map(n => n.identifier));
  for (const [identifier, { at, content }] of wanted) {
    if (have.has(identifier)) continue;
    await Notifications.scheduleNotificationAsync({
      identifier,
      content,
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(at), channelId: CHANNEL_START },
    });
  }
}
