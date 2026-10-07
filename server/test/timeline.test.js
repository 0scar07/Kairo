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
