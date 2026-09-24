const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { RiotLimiter, parseLimits } = require("../lib/limiter");

// El limitador usa temporizadores "unref": en el servidor los mantiene vivos el listener HTTP; aquí, este intervalo
const keepAlive = setInterval(() => {}, 1000);
after(() => clearInterval(keepAlive));

test("respeta la ventana: la tarea i+3 sale al menos 200 ms después de la i (límite 3/200 ms)", async () => {
  const limiter = new RiotLimiter({ windows: [{ limit: 3, ms: 200 }] });
  const t0 = Date.now(), times = [];
  await Promise.all(Array.from({ length: 8 }, () => limiter.schedule(async () => { times.push(Date.now() - t0); })));
  const gaps = times.slice(3).map((t, i) => t - times[i]);
  assert.ok(gaps.every(g => g >= 195), `separaciones: ${gaps.join(",")}`);
});

test("las tareas esperan en vez de fallar y conservan el orden y los valores", async () => {
  const limiter = new RiotLimiter({ windows: [{ limit: 2, ms: 100 }] });
  const order = [];
  const results = await Promise.all([1, 2, 3, 4, 5].map(i => limiter.schedule(async () => { order.push(i); return i * 10; })));
  assert.deepEqual(order, [1, 2, 3, 4, 5]);
  assert.deepEqual(results, [10, 20, 30, 40, 50]);
});

test("un error en una tarea no bloquea las siguientes", async () => {
  const limiter = new RiotLimiter({ windows: [{ limit: 5, ms: 100 }] });
  const r = await Promise.allSettled([limiter.schedule(async () => { throw new Error("boom"); }), limiter.schedule(async () => "sigue")]);
  assert.equal(r[0].status, "rejected");
  assert.equal(r[1].value, "sigue");
});

test("pause() retrasa las salidas (Retry-After de Riot)", async () => {
  const limiter = new RiotLimiter({ windows: [{ limit: 50, ms: 1000 }] });
  limiter.pause(250);
  const start = Date.now();
  await limiter.schedule(async () => 1);
  assert.ok(Date.now() - start >= 230);
});

test("si una petición espera demasiado se rechaza con 429", async () => {
  const limiter = new RiotLimiter({ windows: [{ limit: 1, ms: 400 }], maxWaitMs: 100 });
  const [a, b] = await Promise.allSettled([limiter.schedule(async () => "a"), limiter.schedule(async () => "b")]);
  assert.equal(a.status, "fulfilled");
  assert.equal(b.status, "rejected");
  assert.equal(b.reason.status, 429);
});

test("el tope de cola rechaza con 429", async () => {
  const limiter = new RiotLimiter({ windows: [{ limit: 1, ms: 5000 }], maxQueue: 2 });
  limiter.schedule(async () => 1);
  limiter.schedule(async () => 2);
  limiter.schedule(async () => 3);
  const full = await limiter.schedule(async () => 4).catch(e => e);
  assert.equal(full.status, 429);
});

test("parseLimits acepta '18:1,95:120' y cae al valor por defecto si es inválido", () => {
  assert.deepEqual(parseLimits("18:1,95:120", []), [{ limit: 18, ms: 1000 }, { limit: 95, ms: 120000 }]);
  assert.deepEqual(parseLimits("basura", [1]), [1]);
  assert.deepEqual(parseLimits("", [2]), [2]);
});
