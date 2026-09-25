const { Router } = require("express");
const { handle } = require("../lib/riot");
const { HttpError } = require("../lib/errors");
const art = require("../lib/art");

// Imágenes de las notificaciones: GET /art/banner.png?k=start&n=Faker&q=420&c=103&l=es&sig=...
// Solo se sirven las URLs firmadas por este mismo servidor.
const router = Router();

router.get("/banner.png", handle(async (req, res) => {
  const qs = art.verify(req.query);
  if (!qs) throw new HttpError(403, "Enlace no válido", { code: "BAD_SIGNATURE" });
  const png = await art.bannerFor(qs, req.query);
  res.set("Cache-Control", "public, max-age=86400").type("image/png").send(Buffer.from(png));
}));

module.exports = router;
