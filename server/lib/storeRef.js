// Referencia al almacén de datos para las rutas que no lo reciben por parámetro (las crea index.js al arrancar).
let current = null;
module.exports = { set: store => { current = store; }, get: () => current };
