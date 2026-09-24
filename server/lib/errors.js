// Error con estado HTTP y mensaje en español listo para mostrar en la app
class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    Object.assign(this, extra);
  }
}

module.exports = { HttpError };
