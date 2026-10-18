const test = require("node:test");
const assert = require("node:assert");
const { reduceTimeline } = require("../lib/timeline");

const frame = (timestamp, gold, events = []) => ({
  timestamp,
  participantFrames: { 1: { totalGold: gold, xp: 10, minionsKilled: 3, jungleMinionsKilled: 1 }, 2: { totalGold: gold * 2, xp: 20, minionsKilled: 0 } },
  events,
});

test("reduceTimeline deja oro, xp y CS por minuto en el orden de los jugadores", () => {
  const out = reduceTimeline({
    metadata: { participants: ["a", "b"] },
    info: {
      frameInterval: 60000,
      participants: [{ participantId: 2, puuid: "b" }, { participantId: 1, puuid: "a" }],
      frames: [frame(0, 500), frame(60_500, 900)],
    },
  });
  assert.deepStrictEqual(out.puuids, ["a", "b"]);
  assert.deepStrictEqual(out.frames[1], { t: 1, gold: [900, 1800], xp: [10, 20], cs: [4, 0] });
});

test("reduceTimeline marca objetivos y da la torre al equipo que la destruyó", () => {
  const out = reduceTimeline({
    info: {
      participants: [{ participantId: 1, puuid: "a" }],
      frames: [frame(0, 0, [
        { type: "ELITE_MONSTER_KILL", monsterType: "DRAGON", monsterSubType: "FIRE_DRAGON", killerTeamId: 100, timestamp: 600_000 },
        { type: "BUILDING_KILL", buildingType: "TOWER_BUILDING", teamId: 100, timestamp: 700_000 },
        { type: "CHAMPION_KILL", timestamp: 5 },
      ])],
    },
  });
  assert.deepStrictEqual(out.events, [
    { t: 600_000, type: "dragon", team: 100, sub: "FIRE_DRAGON" },
    { t: 700_000, type: "tower", team: 200 },
  ]);
});

test("reduceTimeline guarda las compras de cada jugador y descarta las deshechas", () => {
  const out = reduceTimeline({
    info: {
      participants: [{ participantId: 1, puuid: "a" }, { participantId: 2, puuid: "b" }],
      frames: [frame(0, 0, [
        { type: "ITEM_PURCHASED", participantId: 1, itemId: 1055, timestamp: 1_000 },
        { type: "ITEM_PURCHASED", participantId: 2, itemId: 1056, timestamp: 2_000 },
        { type: "ITEM_PURCHASED", participantId: 1, itemId: 2003, timestamp: 3_000 },
        { type: "ITEM_UNDO", participantId: 1, beforeId: 2003, afterId: 0, timestamp: 4_000 },
        { type: "ITEM_PURCHASED", participantId: 1, itemId: 3006, timestamp: 485_000 },
      ])],
    },
  });
  assert.deepStrictEqual(out.buys, [[[0, 1055], [8, 3006]], [[0, 1056]]]);
});
