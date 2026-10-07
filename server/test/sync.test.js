const test = require("node:test");
const assert = require("node:assert");
const express = require("express");
const { createSyncRouter, codeOf, parseData } = require("../routes/sync");
const { errorHandler } = require("../lib/riot");

test("codeOf normaliza y valida; parseData limita la forma", () => {
  assert.strictEqual(codeOf("abcd-efgh-jkmn"), "ABCDEFGHJKMN");
  assert.throws(() => codeOf("ABC"), /no válido/);
  assert.throws(() => codeOf("ABCDEFGHJKM0"), /no válido/);   // el 0 no está en el alfabeto
  assert.deepStrictEqual(parseData({ favorites: [{ a: 1 }], extra: "x" }), { favorites: [{ a: 1 }], removed: [] });
  assert.throws(() => parseData({ favorites: "x" }), /favorites/);
  assert.throws(() => parseData({ favorites: Array.from({ length: 201 }, () => ({})) }), /favorites/);
});

test("crear, leer y reemplazar con el código", async () => {
  const kv = new Map();
  const store = { getKV: async k => kv.get(k) ?? null, putKV: async (k, v) => { kv.set(k, v); } };
  const app = express();
  app.use(express.json());
  app.use("/sync", createSyncRouter(store));
  app.use(errorHandler);
  const server = await new Promise(r => { const s = app.listen(0, () => r(s)); });
  const base = `http://127.0.0.1:${server.address().port}/sync`;
  const call = (path, method = "GET", body) => fetch(base + path, { method, headers: { "Content-Type": "application/json" }, body: body && JSON.stringify(body) });
  try {
    const created = await (await call("", "POST", { data: { favorites: [{ gameName: "Faker" }] } })).json();
    assert.match(created.code, /^[A-Z2-9]{12}$/);
    const read = await (await call(`/${created.code.toLowerCase()}`)).json();
    assert.strictEqual(read.data.favorites[0].gameName, "Faker");
    assert.strictEqual((await call(`/${created.code}`, "PUT", { data: { favorites: [], removed: [{ key: "x" }] } })).status, 200);
    assert.strictEqual((await (await call(`/${created.code}`)).json()).data.removed.length, 1);
    assert.strictEqual((await call("/ABCDEFGHJKMN")).status, 404);
  } finally {
    server.close();
  }
});
