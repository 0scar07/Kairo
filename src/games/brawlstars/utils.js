import { colors } from "../../theme";
import { humanize, parseBattleTime, tagOf, titleCase } from "../../utils/supercell";

const RESULT = {
  victory: { label: "VICTORIA", color: colors.win },
  defeat:  { label: "DERROTA",  color: colors.loss },
  draw:    { label: "EMPATE",   color: colors.textSecondary },
};

/**
 * Datos listos para mostrar de una batalla del registro. Los modos por equipos traen `result`
 * (victory/defeat/draw); los Showdown traen `rank` (puesto final).
 */
export function battleView(item, myTag) {
  const b = item.battle || {};
  const teams = b.teams || null;
  const players = teams ? teams.flat() : b.players || [];
  const me = players.find(p => tagOf(p.tag) === myTag);

  let result;
  let win = null;   // true / false / null (empate o sin dato)
  if (b.result) {
    result = RESULT[b.result] || { label: b.result.toUpperCase(), color: colors.textSecondary };
    win = b.result === "victory" ? true : b.result === "defeat" ? false : null;
  } else if (b.rank != null) {
    const groups = teams ? teams.length : players.length;
    // Si la API informa el cambio de trofeos, manda: se gana trofeos solo en la mitad de arriba
    const good = typeof b.trophyChange === "number" ? b.trophyChange > 0 : b.rank <= Math.ceil(groups / 2);
    result = { label: `PUESTO ${b.rank}`, color: b.rank === 1 ? colors.gold : good ? colors.win : colors.loss };
    win = good;
  } else {
    result = { label: "PARTIDA", color: colors.textSecondary };
  }

  return {
    result,
    win,
    isResultBased: Boolean(b.result),
    brawler: me?.brawler || null,
    brawlerName: me?.brawler ? titleCase(me.brawler.name) : "—",
    mode: humanize(item.event?.mode || b.mode),
    map: item.event?.map || null,
    trophyChange: typeof b.trophyChange === "number" ? b.trophyChange : null,
    time: parseBattleTime(item.battleTime),
  };
}

// Resumen de las batallas por equipos: { wins, losses }
export function summarize(views) {
  const wins = views.filter(v => v.isResultBased && v.win === true).length;
  const losses = views.filter(v => v.isResultBased && v.win === false).length;
  return { wins, losses };
}
