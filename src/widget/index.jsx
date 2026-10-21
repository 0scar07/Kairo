import React from "react";
import { hasWidgets, WIDGETS } from "./native";
import { loadFriends, loadNextMatch, loadRankData, prepareLanguage, saveRankData } from "./data";

/**
 * Widgets de Android: el manejador en segundo plano (lo llama Android al añadir, redimensionar y cada 30 minutos) y la
 * actualización desde la app. Todo pasa por hasWidgets(): sin la parte nativa no se toca la librería.
 */
async function render(name, info) {
  const { RankWidget, MatchWidget, FriendsWidget } = require("./Widgets");
  await prepareLanguage();
  if (name === WIDGETS.rank) return <RankWidget data={await loadRankData()} width={info?.width} />;
  if (name === WIDGETS.match) return <MatchWidget match={await loadNextMatch().catch(() => null)} />;
  const rank = await loadRankData();
  return <FriendsWidget friends={await loadFriends().catch(() => [])} dd={rank?.dd} />;
}

/** Se llama una vez al arrancar (index.js), también cuando Android abre la app solo para dibujar un widget */
export function registerWidgets() {
  if (!hasWidgets()) return;
  const { registerWidgetTaskHandler } = require("react-native-android-widget");
  registerWidgetTaskHandler(async ({ widgetInfo, widgetAction, renderWidget }) => {
    if (widgetAction === "WIDGET_DELETED") return;
    try {
      renderWidget(await render(widgetInfo.widgetName, widgetInfo));
    } catch (e) {
      console.warn("Widget:", e.message);
    }
  });
}

/** Vuelve a dibujar los widgets que haya en la pantalla de inicio (si no hay ninguno, no hace nada) */
export async function refreshWidgets(names = Object.values(WIDGETS)) {
  if (!hasWidgets()) return;
  const { requestWidgetUpdate } = require("react-native-android-widget");
  await Promise.all(names.map(widgetName => requestWidgetUpdate({ widgetName, renderWidget: info => render(widgetName, info) }).catch(() => {})));
}

/** Mi perfil guarda su rango para el widget y lo redibuja */
export async function updateRankWidget(rank) {
  if (!hasWidgets()) return;
  await saveRankData(rank);
  await refreshWidgets([WIDGETS.rank]);
}
