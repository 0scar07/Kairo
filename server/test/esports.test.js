const test = require("node:test");
const assert = require("node:assert");
const es = require("../lib/esports");

test("pickLeagues deja solo las ligas de la app, en su orden y con https", () => {
  const out = es.pickLeagues([
    { id: "2", slug: "lec", name: "LEC", region: "EMEA", image: "http://static.lolesports.com/lec.png" },
    { id: "1", slug: "lck", name: "LCK", region: "COREA", image: "http://static.lolesports.com/lck.png" },
    { id: "9", slug: "lfl", name: "LFL" },
  ]);
  assert.deepStrictEqual(out.map(l => l.slug), ["lck", "lec"]);
  assert.strictEqual(out[0].image, "https://static.lolesports.com/lck.png");
  assert.strictEqual(out[0].short, "LCK");
});

test("pickTournaments pone primero el más reciente ya empezado y al final los futuros", () => {
  const now = Date.parse("2026-08-01");
  const out = es.pickTournaments([
    { id: "a", slug: "split_1", startDate: "2026-01-13", endDate: "2026-03-01" },
    { id: "c", slug: "split_4", startDate: "2026-12-01", endDate: "2027-01-01" },
    { id: "b", slug: "split_3", startDate: "2026-07-28", endDate: "2026-09-13" },
  ], now);
  assert.deepStrictEqual(out.map(t => t.id), ["b", "a", "c"]);
});

test("pickStandings arma una tabla por sección y omite las fases sin tabla", () => {
  const out = es.pickStandings([{ stages: [
    { name: "Grupos", sections: [{ name: "Grupo A", rankings: [
      { ordinal: 1, teams: [{ id: "10", slug: "t1", name: "T1", code: "T1", image: "http://x/t1.png", record: { wins: 5, losses: 3 } }] },
      { ordinal: 2, teams: [{ id: "11", slug: "geng", name: "Gen.G", code: "GEN", record: { wins: 4, losses: 4 } }] },
    ] }] },
    { name: "Play-Ins", sections: [{ name: "Play-Ins", rankings: [] }] },
  ] }]);
  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0].name, "Grupo A");
  assert.deepStrictEqual(out[0].rows.map(r => [r.position, r.code, r.wins, r.losses]), [[1, "T1", 5, 3], [2, "GEN", 4, 4]]);
  assert.strictEqual(out[0].rows[0].image, "https://x/t1.png");
});

test("pickTeam ordena el roster por rol y quita las fotos por defecto", () => {
  const out = es.pickTeam({ id: "10", slug: "t1", name: "T1", code: "T1", homeLeague: { name: "LCK" }, players: [
    { id: 3, summonerName: "Keria", role: "support", image: "http://x/keria.png" },
    { id: 1, summonerName: "Doran", role: "top", image: "http://static.lolesports.com/players/default-headshot.png" },
    { id: 2, summonerName: "Faker", firstName: "Sanghyeok", lastName: "Lee", role: "mid", image: "http://x/faker.png" },
    { id: 4, summonerName: "Coach", role: "none" },
  ] });
  assert.deepStrictEqual(out.players.map(p => p.name), ["Doran", "Faker", "Keria", "Coach"]);
  assert.strictEqual(out.players[0].image, null);
  assert.strictEqual(out.players[1].image, "https://x/faker.png");
  assert.strictEqual(out.players[3].role, null);
  assert.strictEqual(out.league, "LCK");
});

test("teamSeries encuentra las series del equipo por código y guarda el marcador", () => {
  const out = es.teamSeries([
    { startTime: "t", match: { id: "m1", teams: [{ code: "T1", result: { gameWins: 2 } }, { code: "GEN", name: "Gen.G", result: { gameWins: 1 } }] }, games: [{ id: "g1" }, { id: "g2" }, { id: "g3" }] },
    { startTime: "t", match: { id: "m2", teams: [{ code: "DK" }, { code: "HLE" }] }, games: [{ id: "g4" }] },
  ], { code: "T1", name: "T1" });
  assert.strictEqual(out.length, 1);
  assert.deepStrictEqual(out[0].gameIds, ["g1", "g2", "g3"]);
  assert.strictEqual(out[0].teamWins, 2);
  assert.strictEqual(out[0].rival.code, "GEN");
});

// Partida mínima del feed: el equipo azul (100) destruye más y gana
function feedGame({ blueId = "100", redId = "200", blueTowers = 9, redTowers = 3, state = "finished" } = {}) {
  const pm = (from, ids) => ids.map((pid, i) => ({ participantId: from + i, esportsPlayerId: pid, championId: `Champ${from + i}`, role: "mid" }));
  return {
    first: {
      gameMetadata: { patchVersion: "16.17", blueTeamMetadata: { esportsTeamId: blueId, participantMetadata: pm(1, ["p1", "p2"]) }, redTeamMetadata: { esportsTeamId: redId, participantMetadata: pm(6, ["q1", "q2"]) } },
      frames: [{ rfc460Timestamp: "2026-09-13T05:30:00.000Z", gameState: "in_game" }],
    },
    last: { frames: [{ rfc460Timestamp: "2026-09-13T06:00:00.000Z", gameState: state, blueTeam: { inhibitors: 1, towers: blueTowers, totalGold: 70000, totalKills: 20 }, redTeam: { inhibitors: 0, towers: redTowers, totalGold: 60000, totalKills: 10 } }] },
    details: { frames: [{ participants: [
      { participantId: 1, kills: 5, deaths: 1, assists: 7, totalGoldEarned: 15000, creepScore: 300, championDamageShare: 0.3 },
      { participantId: 2, kills: 3, deaths: 2, assists: 9, totalGoldEarned: 12000, creepScore: 50, championDamageShare: 0.1 },
      { participantId: 6, kills: 4, deaths: 4, assists: 2, totalGoldEarned: 11000, creepScore: 280, championDamageShare: 0.35 },
      { participantId: 7, kills: 1, deaths: 5, assists: 3, totalGoldEarned: 9000, creepScore: 40, championDamageShare: 0.12 },
    ] }] },
  };
}

test("reduceGame resume una partida terminada y la descarta si no terminó", () => {
  const g = es.reduceGame(feedGame());
  assert.strictEqual(g.seconds, 1800);
  assert.strictEqual(g.blueAhead, true);
  assert.strictEqual(g.players.length, 4);
  const p1 = g.players.find(p => p.playerId === "p1");
  assert.deepStrictEqual([p1.kills, p1.deaths, p1.assists, p1.gold, p1.cs, p1.teamKills, p1.side], [5, 1, 7, 15000, 300, 20, "blue"]);
  assert.strictEqual(es.reduceGame(feedGame({ state: "in_game" })), null);
  assert.strictEqual(es.reduceGame({ first: null, last: null, details: null }), null);
});

test("seriesResults respeta el marcador: la última partida es del ganador de la serie", () => {
  const blueWin = es.reduceGame(feedGame());
  // El equipo 100 jugó de azul y parece haber ganado las tres, pero la serie terminó 2-1 a su favor
  assert.deepStrictEqual(es.seriesResults([blueWin, blueWin, blueWin], "100", 2), [true, false, true]);
  // Perdió 0-2 aunque las partidas "parezcan" ganadas: manda el marcador
  assert.deepStrictEqual(es.seriesResults([blueWin, blueWin], "100", 0), [false, false]);
  assert.deepStrictEqual(es.seriesResults([], "100", 0), []);
});

test("rosterStats suma partidas, victorias, KDA, KP, oro y CS por minuto y campeones", () => {
  const g = es.reduceGame(feedGame());
  const out = es.rosterStats([{ teamWins: 1, games: [g] }, { teamWins: 0, games: [g] }], "100");
  const p1 = out.p1;
  assert.strictEqual(p1.games, 2);
  assert.strictEqual(p1.wins, 1);
  assert.strictEqual(p1.kda, 12);                // (10 + 14) / 2
  assert.strictEqual(p1.killParticipation, 60);  // (10 + 14) / 40
  assert.strictEqual(p1.goldPerMin, 500);        // 30000 de oro en 60 min
  assert.strictEqual(p1.csPerMin, 10);
  assert.strictEqual(p1.damageShare, 30);
  assert.deepStrictEqual(p1.champions.map(c => [c.name, c.games, c.wins]), [["Champ1", 2, 1]]);
  assert.strictEqual(out.q1, undefined);         // los del rival no cuentan
});

test("endTimestamp suma los minutos y redondea a 10 segundos", () => {
  assert.strictEqual(es.endTimestamp("2026-09-13T05:30:06.286Z"), "2026-09-13T07:00:00.000Z");
});

test("standingsFromEvents arma la tabla con las series terminadas cuando el torneo no tiene clasificación", () => {
  const index = es.teamIndex([
    { slug: "t1", id: "1", code: "T1", name: "T1" },
    { slug: "geng", id: "2", code: "GEN", name: "Gen.G" },
    { slug: "g2", id: "3", code: "G2", name: "G2 Esports" },
    { slug: "tbd", id: "0", code: "TBD", name: "TBD" },
  ]);
  const ev = (a, ga, b, gb) => ({ match: { teams: [{ code: a, name: a, result: { gameWins: ga } }, { code: b, name: b, result: { gameWins: gb } }] } });
  const out = es.standingsFromEvents([ev("T1", 2, "GEN", 1), ev("G2", 2, "T1", 0), ev("GEN", 2, "G2", 0), ev("T1", 1, "G2", 1)], index);
  assert.strictEqual(out.length, 1);
  assert.deepStrictEqual(out[0].rows.map(r => [r.position, r.slug, r.wins, r.losses]), [[1, "geng", 1, 1], [2, "g2", 1, 1], [3, "t1", 1, 1]]);
  assert.deepStrictEqual(es.standingsFromEvents([], index), []);
});
