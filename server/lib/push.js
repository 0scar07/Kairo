const axios = require("axios");

/**
 * Cliente de Expo Push (https://docs.expo.dev/push-notifications/sending-notifications/).
 * Envía en tandas de 100 y devuelve un resultado por mensaje, en el mismo orden:
 *   { ok: true, id } | { ok: false, error: "DeviceNotRegistered" | ... }
 * Los recibos (receipts) llegan más tarde y son los que delatan un token muerto: se consultan con checkReceipts.
 */
const BASE = () => process.env.EXPO_PUSH_BASE || "https://exp.host/--/api/v2";
const CHUNK = 100;

const headers = () => ({
  Accept: "application/json",
  "Content-Type": "application/json",
  ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
});

const chunks = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));

async function send(messages) {
  const results = [];
  for (const batch of chunks(messages, CHUNK)) {
    try {
      const { data } = await axios.post(`${BASE()}/push/send`, batch, { headers: headers(), timeout: 15_000 });
      const tickets = Array.isArray(data?.data) ? data.data : [];
      batch.forEach((_, i) => {
        const t = tickets[i];
        results.push(t?.status === "ok" ? { ok: true, id: t.id } : { ok: false, error: t?.details?.error || t?.message || "UNKNOWN" });
      });
    } catch (e) {
      console.warn(`Expo Push falló (${e.response?.status || e.code || e.message}); ${batch.length} aviso(s) sin enviar`);
      batch.forEach(() => results.push({ ok: false, error: "SEND_FAILED" }));
    }
  }
  return results;
}

// ids de recibo -> { [id]: { status, details } } (los que Expo ya conoce)
async function receipts(ids) {
  const out = {};
  for (const batch of chunks(ids, 300)) {
    try {
      const { data } = await axios.post(`${BASE()}/push/getReceipts`, { ids: batch }, { headers: headers(), timeout: 15_000 });
      Object.assign(out, data?.data || {});
    } catch (e) {
      console.warn(`Expo Push: no pude leer recibos (${e.response?.status || e.code || e.message})`);
    }
  }
  return out;
}

module.exports = { send, receipts };
