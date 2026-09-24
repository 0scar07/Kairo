const test = require("node:test");
const assert = require("node:assert");
const { normalizeLive, soloEntry } = require("../lib/live");

const game = {
  gameId: 123, gameMode: "CLASSIC", gameType: "MATCHED_GAME", gameQueueConfigId: 420, mapId: 11,
  gameStartTime: 1_700_000_000_000, gameLength: 421,
  bannedChampions: [{ championId: 157, teamId: 100, pickTurn: 1 }],
  participants: [
    { puuid: "p1", riotId: "Uno#KR1", teamId: 100, championId: 103, spell1Id: 4, spell2Id: 14, profileIconId: 10,
      perks: { perkIds: [8112, 8126, 8138], perkStyle: 8100, perkSubStyle: 8300 } },
    { puuid: "p2", riotId: "Dos#KR1", teamId: 200, championId: 1, spell1Id: 4, spell2Id: 7, bot: false, perks: { perkIds: [] } },
    { teamId: 200, championId: 2, spell1Id: 4, spell2Id: 7, bot: true },
  ],
};

test("soloEntry se queda con Solo/Dúo y con lo que usa la app", () => {
  const entries = [
    { queueType: "RANKED_FLEX_SR", tier: "GOLD" },
    { queueType: "RANKED_SOLO_5x5", tier: "DIAMOND", rank: "II", leaguePoints: 45, wins: 10, losses: 5, hotStreak: true, leagueId: "x" },
  ];
  assert.deepStrictEqual(soloEntry(entries), { tier: "DIAMOND", rank: "II", leaguePoints: 45, wins: 10, losses: 5 });
  assert.strictEqual(soloEntry([]), null);
  assert.strictEqual(soloEntry(undefined), null);
});

test("normalizeLive devuelve equipos, runas, baneos y rango de cada jugador", () => {
  const out = normalizeLive(game, { p1: { tier: "GOLD", rank: "IV", leaguePoints: 0, wins: 1, losses: 1 }, p2: null });
  assert.strictEqual(out.inGame, true);
  assert.strictEqual(out.queueId, 420);
  assert.strictEqual(out.startTime, 1_700_000_000_000);
  assert.deepStrictEqual(out.bans, [{ championId: 157, teamId: 100, pickTurn: 1 }]);
  assert.strictEqual(out.participants.length, 3);

  const [uno, dos, bot] = out.participants;
  assert.strictEqual(uno.keystone, 8112);
  assert.strictEqual(uno.secondary, 8300);
  assert.strictEqual(uno.ranked.tier, "GOLD");
  assert.strictEqual(dos.ranked, null);
  assert.strictEqual(dos.keystone, null);          // sin runas informadas
  assert.strictEqual(bot.bot, true);
  assert.strictEqual(bot.puuid, null);
  assert.strictEqual(bot.ranked, null);
});

test("mientras la partida carga startTime es 0", () => {
  assert.strictEqual(normalizeLive({ ...game, gameStartTime: 0 }).startTime, 0);
});
