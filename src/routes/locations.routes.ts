import { Router, Request, Response } from "express";
import { ARGENTINA_PROVINCES } from "../data/argentina";

const router = Router();

/** GET /api/locations — Provincias de Argentina (listado estático). */
router.get("/", (_req: Request, res: Response) => {
  res.json({
    provinces: ARGENTINA_PROVINCES.map((name) => ({ id: name, name })),
  });
});

export default router;
