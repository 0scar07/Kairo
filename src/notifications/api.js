import { api } from "../api/client";

// Registro de dispositivos en el backend (ver server/routes/devices.js). Sin cuentas: el dispositivo se identifica
// con el secreto que recibió al registrarse.
const auth = d => ({ headers: { Authorization: `Device ${d.deviceId}.${d.secret}` } });

export const registerDevice = body => api.post("/devices", body).then(r => r.data);
export const putFavorites = (d, favorites) => api.put("/devices/me/favorites", { favorites }, auth(d)).then(r => r.data);
export const putSettings = (d, settings) => api.put("/devices/me/settings", settings, auth(d)).then(r => r.data);
export const putToken = (d, pushToken) => api.put("/devices/me/token", { pushToken }, auth(d)).then(r => r.data);
export const sendTest = (d, type) => api.post("/devices/me/test", { type }, auth(d)).then(r => r.data);
export const deleteDevice = d => api.delete("/devices/me", auth(d));

// ¿El servidor ya no reconoce a este dispositivo? (se reinstaló, se borró la base…)
export const isAuthError = e => e?.response?.status === 401 && e.response?.data?.code === "DEVICE_AUTH";
