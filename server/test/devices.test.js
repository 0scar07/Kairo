const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const express = require("express");
const { JsonStore, PostgresStore } = require("../lib/store");
const { createDevicesRouter } = require("../routes/devices");
const { errorHandler } = require("../lib/riot");
const { parseFavorites, parseSettings, DEFAULT_SETTINGS } = require("../lib/devices");

const TOKEN = "ExponentPushToken[abcdefghijklmnopqrstuv]";
const TOKEN2 = "ExponentPushToken[zzzzzzzzzzzzzzzzzzzzzz]";
const PUUID = "a".repeat(78);
const PUUID2 = "b".repeat(78);

// ---------- Almacenes: el mismo contrato para JSON y Postgres ----------
function makeStores() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kairo-devices-"));
  const stores = { json: () => new JsonStore({ file: path.join(dir, "devices.json"), flushMs: 5 }) };
  try {
    const { newDb } = require("pg-mem");
    stores.postgres = () => { const { Pool } = newDb().adapters.createPg(); return new PostgresStore({ pool: new Pool() }); };
  } catch { /* pg-mem es solo de desarrollo: sin él se prueba solo JSON */ }
  return { dir, stores };
}

for (const kind of ["json", "postgres"]) {
  const { dir, stores } = makeStores();
  if (!stores[kind]) continue;

  test(`almacén ${kind}: guardar, buscar por id y por token, listar, contar y borrar`, async () => {
    const store = stores[kind]();
    await store.init();
    const doc = { id: "d1", pushToken: TOKEN, secretHash: "h", favorites: [], settings: {} };
    await store.put(doc);
    assert.strictEqual(await store.count(), 1);
    assert.strictEqual((await store.get("d1")).pushToken, TOKEN);
    assert.strictEqual((await store.getByToken(TOKEN)).id, "d1");
    assert.strictEqual(await store.get("nada"), null);
    assert.strictEqual((await store.list()).length, 1);

    await store.put({ ...doc, favorites: [{ puuid: PUUID }] });   // actualizar no duplica
    assert.strictEqual(await store.count(), 1);
    assert.strictEqual((await store.get("d1")).favorites.length, 1);

    assert.strictEqual(await store.remove("d1"), true);
    assert.strictEqual(await store.remove("d1"), false);
    assert.strictEqual(await store.count(), 0);
    await store.close();
  });

  test(`almacén ${kind}: un token pertenece a un solo dispositivo`, async () => {
    const store = stores[kind]();
    await store.init();
    await store.put({ id: "a", pushToken: TOKEN });
    await store.put({ id: "b", pushToken: TOKEN });   // "b" se queda con el token y "a" desaparece
    assert.strictEqual(await store.count(), 1);
    assert.strictEqual((await store.getByToken(TOKEN)).id, "b");
    await store.close();
  });
}

test("almacén JSON: sobrevive a un reinicio y un archivo dañado no tumba el servidor", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kairo-json-"));
  const file = path.join(dir, "devices.json");
  const a = new JsonStore({ file, flushMs: 5 });
  await a.init();
  await a.put({ id: "d1", pushToken: TOKEN, favorites: [] });
  await a.close();

  const b = new JsonStore({ file });
  await b.init();
  assert.strictEqual((await b.get("d1")).pushToken, TOKEN);

  fs.writeFileSync(file, "{esto no es json");
  const c = new JsonStore({ file });
  await c.init();
  assert.strictEqual(await c.count(), 0);
  assert.ok(fs.readdirSync(dir).some(f => f.includes("dañado")), "el archivo roto se conserva aparte");
});

// ---------- Validación ----------
test("favoritos: valida, limpia campos extra y elimina duplicados", () => {
  const out = parseFavorites([
    { puuid: PUUID, region: "la1", riotId: "  Faker#KR1  ", muted: true, extra: "x" },
    { puuid: PUUID, region: "la1" },
    { puuid: PUUID2, region: "kr" },
  ]);
  assert.deepStrictEqual(out, [
    { puuid: PUUID, region: "la1", riotId: "Faker#KR1", muted: true },
    { puuid: PUUID2, region: "kr", riotId: "", muted: false },
  ]);
  for (const bad of ["x", [{ puuid: "corto", region: "la1" }], [{ puuid: PUUID, region: "marte" }], [{ puuid: PUUID, region: "la1", muted: "si" }]]) {
    assert.throws(() => parseFavorites(bad), e => e.status === 400 && /FAVORITES/.test(e.code));
  }
  assert.throws(() => parseFavorites(Array.from({ length: 31 }, (_, i) => ({ puuid: String(i).padStart(30, "c"), region: "la1" }))), e => e.code === "TOO_MANY_FAVORITES");
});

test("ajustes: cambios parciales que conservan el resto y rechazan valores raros", () => {
  const a = parseSettings({ notifyEnd: false, quiet: { enabled: true, from: "22:30", utcOffsetMinutes: -300 } });
  assert.strictEqual(a.notifyEnd, false);
  assert.strictEqual(a.notifyStart, true);
  assert.deepStrictEqual(a.quiet, { enabled: true, from: "22:30", to: "07:00", utcOffsetMinutes: -300 });
  assert.deepStrictEqual(DEFAULT_SETTINGS.quiet, { enabled: false, from: "23:00", to: "07:00", utcOffsetMinutes: 0 }, "los valores por defecto no se modifican");
  for (const bad of [null, [], { enabled: "si" }, { quiet: { from: "25:00" } }, { quiet: { utcOffsetMinutes: 5000 } }, { quiet: 3 }]) {
    assert.throws(() => parseSettings(bad), e => e.status === 400 && e.code === "INVALID_SETTINGS");
  }
});

// ---------- Endpoints ----------
let server, base, store;
test.before(async () => {
  store = new JsonStore({ file: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "kairo-api-")), "devices.json"), flushMs: 5 });
  await store.init();
  const app = express();
  app.use(express.json({ limit: "10kb" }));
  app.use("/devices", createDevicesRouter(store, { maxDevices: 3, registerPerHour: 1000 }));
  app.use(errorHandler);
  await new Promise(r => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(async () => { server.close(); await store.close(); });

const call = async (method, url, body, auth) => {
  const r = await fetch(base + url, {
    method,
    headers: { "Content-Type": "application/json", ...(auth ? { Authorization: `Device ${auth.deviceId}.${auth.secret}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: r.status, body: r.status === 204 ? null : await r.json() };
};

test("registro: crea el dispositivo, entrega el secreto una vez y no filtra datos internos", async () => {
  const r = await call("POST", "/devices", { pushToken: TOKEN, favorites: [{ puuid: PUUID, region: "la1", riotId: "Faker#KR1" }] });
  assert.strictEqual(r.status, 201);
  assert.match(r.body.deviceId, /^[0-9a-f-]{36}$/);
  assert.ok(r.body.secret.length >= 40);
  assert.deepStrictEqual(r.body.device.settings, DEFAULT_SETTINGS);
  assert.strictEqual(r.body.device.favorites.length, 1);
  assert.ok(!JSON.stringify(r.body.device).includes(TOKEN) && !("secretHash" in r.body.device));

  const saved = await store.get(r.body.deviceId);
  assert.notStrictEqual(saved.secretHash, r.body.secret, "el secreto se guarda con hash");

  const me = await call("GET", "/devices/me", undefined, r.body);
  assert.strictEqual(me.status, 200);
  assert.strictEqual(me.body.id, r.body.deviceId);
});

test("registro: validaciones y volver a registrar el mismo token entrega un secreto nuevo sin perder datos", async () => {
  assert.strictEqual((await call("POST", "/devices", {})).body.code, "INVALID_PUSH_TOKEN");
  assert.strictEqual((await call("POST", "/devices", { pushToken: "abc" })).body.code, "INVALID_PUSH_TOKEN");
  assert.strictEqual((await call("POST", "/devices", { pushToken: TOKEN, platform: "windows" })).body.code, "INVALID_PLATFORM");
  assert.strictEqual((await call("POST", "/devices", { pushToken: TOKEN, favorites: "x" })).body.code, "INVALID_FAVORITES");

  const first = (await call("POST", "/devices", { pushToken: TOKEN })).body;
  const again = await call("POST", "/devices", { pushToken: TOKEN });
  assert.strictEqual(again.status, 200);
  assert.strictEqual(again.body.deviceId, first.deviceId);
  assert.notStrictEqual(again.body.secret, first.secret);
  assert.strictEqual(again.body.device.favorites.length, 1, "conserva los favoritos");
  assert.strictEqual((await call("GET", "/devices/me", undefined, first)).body.code, "DEVICE_AUTH", "el secreto anterior deja de valer");
  assert.strictEqual((await call("GET", "/devices/me", undefined, again.body)).status, 200);
});

test("autenticación: sin encabezado, con secreto incorrecto o con ID inexistente responde 401", async () => {
  const dev = (await call("POST", "/devices", { pushToken: TOKEN })).body;
  for (const auth of [undefined, { deviceId: dev.deviceId, secret: "x".repeat(43) }, { deviceId: "00000000-0000-0000-0000-000000000000", secret: dev.secret }]) {
    const r = await call("GET", "/devices/me", undefined, auth);
    assert.strictEqual(r.status, 401);
    assert.strictEqual(r.body.code, "DEVICE_AUTH");
  }
});

test("favoritos y ajustes se actualizan y quedan guardados", async () => {
  const dev = (await call("POST", "/devices", { pushToken: TOKEN })).body;
  const fav = await call("PUT", "/devices/me/favorites", { favorites: [{ puuid: PUUID2, region: "kr", riotId: "Otro#1", muted: true }] }, dev);
  assert.strictEqual(fav.status, 200);
  assert.strictEqual(fav.body.favorites[0].muted, true);

  const set = await call("PUT", "/devices/me/settings", { notifyEnd: false, quiet: { enabled: true } }, dev);
  assert.strictEqual(set.body.settings.notifyEnd, false);
  assert.strictEqual(set.body.settings.notifyStart, true);
  assert.strictEqual(set.body.settings.quiet.enabled, true);

  assert.strictEqual((await call("PUT", "/devices/me/settings", { enabled: "si" }, dev)).body.code, "INVALID_SETTINGS");
  const me = (await call("GET", "/devices/me", undefined, dev)).body;
  assert.strictEqual(me.favorites.length, 1);
  assert.strictEqual(me.settings.notifyEnd, false);
});

test("token: se puede rotar; uno ya usado por otro dispositivo pasa a este", async () => {
  const a = (await call("POST", "/devices", { pushToken: TOKEN })).body;
  const b = (await call("POST", "/devices", { pushToken: TOKEN2 })).body;
  const rotated = await call("PUT", "/devices/me/token", { pushToken: "ExponentPushToken[nuevonuevonuevonuevo]" }, a);
  assert.strictEqual(rotated.status, 200);
  assert.strictEqual((await store.getByToken("ExponentPushToken[nuevonuevonuevonuevo]")).id, a.deviceId);
  assert.strictEqual((await call("PUT", "/devices/me/token", { pushToken: "malo" }, a)).body.code, "INVALID_PUSH_TOKEN");
  await call("PUT", "/devices/me/token", { pushToken: TOKEN2 }, a);   // b tenía TOKEN2: desaparece
  assert.strictEqual((await call("GET", "/devices/me", undefined, b)).status, 401);
});

test("baja: DELETE elimina el dispositivo", async () => {
  const dev = (await call("POST", "/devices", { pushToken: TOKEN })).body;
  assert.strictEqual((await call("DELETE", "/devices/me", undefined, dev)).status, 204);
  assert.strictEqual((await call("GET", "/devices/me", undefined, dev)).status, 401);
  assert.strictEqual(await store.get(dev.deviceId), null);
});

test("tope de dispositivos: al llenarse rechaza altas nuevas pero deja re-registrar los existentes", async () => {
  for (const d of await store.list()) await store.remove(d.id);
  const tokens = [1, 2, 3].map(i => `ExponentPushToken[tokentokentoken${i}xx]`);
  for (const t of tokens) assert.strictEqual((await call("POST", "/devices", { pushToken: t })).status, 201);
  const full = await call("POST", "/devices", { pushToken: "ExponentPushToken[cuartocuartocuarto]" });
  assert.strictEqual(full.status, 503);
  assert.strictEqual(full.body.code, "DEVICE_LIMIT");
  assert.strictEqual((await call("POST", "/devices", { pushToken: tokens[0] })).status, 200);
});

test("límite de registros por IP", async () => {
  const app = express();
  app.use(express.json());
  app.use("/devices", createDevicesRouter(new JsonStore({ file: path.join(os.tmpdir(), `kairo-lim-${Date.now()}.json`) }), { registerPerHour: 2 }));
  app.use(errorHandler);
  const s = await new Promise(r => { const x = app.listen(0, () => r(x)); });
  try {
    const url = `http://127.0.0.1:${s.address().port}/devices`;
    const post = i => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pushToken: `ExponentPushToken[limitelimitelimite${i}]` }) });
    assert.strictEqual((await post(1)).status, 201);
    assert.strictEqual((await post(2)).status, 201);
    const blocked = await post(3);
    assert.strictEqual(blocked.status, 429);
    assert.strictEqual((await blocked.json()).code, "RATE_LIMITED_IP");
  } finally { s.close(); }
});
