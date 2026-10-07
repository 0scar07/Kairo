// Reparte cada aviso por su canal: a Expo (la app) o a Web Push (navegadores de Kairo Web), con la misma interfaz que
// lib/push.js (send y receipts). Así el vigilante y los demás módulos no cambian, y un token web nunca llega a Expo.

function createPushRouter({ expo, web, store }) {
  async function send(messages) {
    const results = new Array(messages.length);
    const expoIdx = [], webIdx = [];
    messages.forEach((m, i) => (web.isWebToken(m.to) ? webIdx : expoIdx).push(i));

    if (expoIdx.length) {
      const out = await expo.send(expoIdx.map(i => messages[i]));
      expoIdx.forEach((i, k) => { results[i] = out[k]; });
    }
    for (const i of webIdx) {
      const device = await store.getByToken(messages[i].to).catch(() => null);
      results[i] = device?.webPush ? await web.send(device.webPush, messages[i]) : { ok: false, error: "DeviceNotRegistered" };
    }
    return results;
  }
  // Solo Expo tiene recibos; los avisos web se confirman al enviarse
  const receipts = ids => expo.receipts(ids);
  return { send, receipts };
}

module.exports = { createPushRouter };
