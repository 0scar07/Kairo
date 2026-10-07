const test = require("node:test");
const assert = require("node:assert");
const { reduceMatch } = require("../routes/dota2");

test("reduceMatch deja los 10 jugadores con objetos, oro y daño", () => {
  const out = reduceMatch({
    match_id: 1, radiant_win: false, duration: 2100, radiant_gold_adv: [0, 120, -300],
    players: [
      { account_id: 5, personaname: "Uno", player_slot: 0, hero_id: 1, kills: 3, deaths: 1, assists: 7, item_0: 1, item_3: 50, backpack_1: 9, item_neutral: 300, net_worth: 15000, hero_damage: 20000 },
      { account_id: null, player_slot: 128, hero_id: 2, isRadiant: false },
    ],
  });
  assert.strictEqual(out.radiantWin, false);
  assert.deepStrictEqual(out.goldAdvantage, [0, 120, -300]);
  const [uno, anon] = out.players;
  assert.strictEqual(uno.radiant, true);
  assert.deepStrictEqual(uno.items, [1, 0, 0, 50, 0, 0]);
  assert.deepStrictEqual(uno.backpack, [0, 9, 0]);
  assert.strictEqual(uno.neutral, 300);
  assert.strictEqual(uno.accountId, "5");
  assert.strictEqual(anon.accountId, null);   // perfil privado
  assert.strictEqual(anon.radiant, false);
});
