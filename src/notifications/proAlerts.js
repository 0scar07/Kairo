import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { getProNext } from "../games/lol/esports";
import { loadFollowedPros } from "../utils/followedPros";
import { CHANNEL_START, getPermission } from "./push";
import { t } from "../i18n";

const LEAD_MS = 15 * 60_000;   // el aviso llega 15 minutos antes de la partida
const KIND = "pro_match";

/**
 * Avisos de las partidas oficiales de los pros seguidos, programados en el propio celular (sin servidor): uno por
 * equipo, 15 minutos antes de su próxima partida. Se rehace al abrir la app y al seguir o dejar de seguir a alguien,
 * así un cambio de horario se corrige solo; los avisos que ya no tocan se cancelan. En la web no hace nada.
 */
export async function syncProAlerts() {
  if (Platform.OS === "web") return;
  if ((await getPermission().catch(() => "denied")) !== "granted") return;

  const pros = (await loadFollowedPros()).filter(p => p.alerts !== false);
  const byTeam = new Map();
  for (const p of pros) {
    if (!byTeam.has(p.slug)) byTeam.set(p.slug, []);
    byTeam.get(p.slug).push(p);
  }

  const wanted = new Map();   // identificador -> { at, content }
  await Promise.all([...byTeam].map(async ([slug, players]) => {
    const next = (await getProNext(slug).catch(() => null))?.next;
    if (!next || next.state !== "unstarted") return;
    const at = Date.parse(next.startTime) - LEAD_MS;
    if (!(at > Date.now() + 60_000)) return;
    const team = players[0].teamCode || players[0].teamName;
    const rival = next.opponent?.code || next.opponent?.name || "TBD";
    wanted.set(`${KIND}-${slug}-${next.startTime}`, {
      at,
      content: {
        title: t("proAlerts.title", { team, rival }),
        body: t("proAlerts.body", { players: players.map(p => p.name).join(", "), league: next.league?.name || "", minutes: LEAD_MS / 60_000 }),
        data: { type: KIND, slug, playerId: players[0].playerId, leagueSlug: players[0].leagueSlug },
      },
    });
  }));

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
