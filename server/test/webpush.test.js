const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const express = require("express");
const webpush = require("../lib/webpush");
const { createPushRouter } = require("../lib/pushRouter");
const { JsonStore } = require("../lib/store");
const { createDevicesRouter } = require("../routes/devices");
const { errorHandler } = require("../lib/riot");

const SUB = { endpoint: "https://fcm.googleapis.com/fcm/send/abc123", keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" } };

test("parseSubscription acepta una suscripción válida y rechaza las demás", () => {
  assert.deepStrictEqual(webpush.parseSubscription({ ...SUB, expirationTime: null }), SUB);
  assert.throws(() => webpush.parseSubscription({ endpoint: "http://inseguro.com", keys: SUB.keys }), /endpoint/);
  assert.throws(() => webpush.parseSubscription({ endpoint: SUB.endpoint, keys: { p256dh: "x y", auth: "z" } }), /claves/);
  assert.throws(() => webpush.parseSubscription(null));
});

test("tokenFor es estable y nunca parece un token de Expo", () => {
  const t = webpush.tokenFor(SUB);
  assert.strictEqual(t, webpush.tokenFor({ ...SUB }));
  assert.ok(webpush.isWebToken(t));
  assert.ok(!webpush.isWebToken("ExponentPushToken[abc]"));
});

test("pathFor lleva a la partida en vivo, al perfil o a favoritos", () => {
  assert.strictEqual(webpush.pathFor({ type: "live_start", region: "la1", riotId: "Hide on bush#KR1" }), "lol/lan/Hide%20on%20bush-KR1/en-vivo");
  assert.strictEqual(webpush.pathFor({ type: "live_end", region: "kr", riotId: "Faker#KR1" }), "lol/kr/Faker-KR1");
  assert.strictEqual(webpush.pathFor({ type: "weekly" }), "favoritos");
});

test("el repartidor manda a Expo solo los tokens de Expo y los web por Web Push, en orden", async () => {
  const webToken = webpush.tokenFor(SUB);
  const expoSent = [];
  const expo = { send: async msgs => { expoSent.push(...msgs); return msgs.map((_, i) => ({ ok: true, id: `r${i}` })); }, receipts: async () => ({}) };
  const webSent = [];
  const web = { ...webpush, send: async (sub, msg) => { webSent.push({ sub, msg }); return { ok: true }; } };
  const store = { getByToken: async t => (t === webToken ? { webPush: SUB } : null) };
  const router = createPushRouter({ expo, web, store });
  const results = await router.send([{ to: "ExponentPushToken[a]", title: "1" }, { to: webToken, title: "2" }, { to: "WebPush[desconocido]", title: "3" }]);
  assert.deepStrictEqual(expoSent.map(m => m.title), ["1"]);
  assert.deepStrictEqual(webSent.map(w => w.msg.title), ["2"]);
  assert.deepStrictEqual(results, [{ ok: true, id: "r0" }, { ok: true }, { ok: false, error: "DeviceNotRegistered" }]);
});

test("un navegador se registra con su suscripción y no queda con token de Expo", async () => {
  process.env.WEBPUSH_PUBLIC_KEY = "clave-publica";
  process.env.WEBPUSH_PRIVATE_KEY = "clave-privada";
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kairo-web-"));
  const store = new JsonStore({ file: path.join(dir, "d.json"), flushMs: 5 });
  await store.init();
  const app = express();
  app.use(express.json());
  app.use("/devices", createDevicesRouter(store));
  app.use(errorHandler);
  const server = await new Promise(r => { const s = app.listen(0, () => r(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const key = await (await fetch(`${base}/devices/webpush-key`)).json();
    assert.strictEqual(key.publicKey, "clave-publica");
    const res = await fetch(`${base}/devices`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platform: "web", webPush: SUB, favorites: [] }) });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.device.platform, "web");
    const saved = await store.get(body.deviceId);
    assert.ok(webpush.isWebToken(saved.pushToken));
    assert.deepStrictEqual(saved.webPush, SUB);
    assert.strictEqual(body.device.webPush, undefined);   // la suscripción no se devuelve
  } finally {
    server.close();
    delete process.env.WEBPUSH_PUBLIC_KEY;
    delete process.env.WEBPUSH_PRIVATE_KEY;
  }
});
