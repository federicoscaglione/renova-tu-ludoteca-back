import { Router, Request, Response, NextFunction } from "express";
import * as georef from "../services/georef";

const router = Router();

/** GET /api/locations — Provincias de Argentina (API GeoRef, datos.gob.ar). */
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const provinces = await georef.getProvincias();
    res.json({ provinces: provinces.map((p) => ({ id: p.id, name: p.nombre })) });
  } catch (e) {
    next(e);
  }
});

/** GET /api/locations/departamentos?provincia=06 — Departamentos de una provincia. */
router.get("/departamentos", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const provinciaId = typeof req.query.provincia === "string" ? req.query.provincia.trim() : "";
    if (!provinciaId) {
      res.status(400).json({ error: "Falta el parámetro provincia." });
      return;
    }
    const departamentos = await georef.getDepartamentos(provinciaId);
    res.json({ departamentos: departamentos.map((d) => ({ id: d.id, nombre: d.nombre })) });
  } catch (e) {
    next(e);
  }
});

/** GET /api/locations/municipios?provincia=06 — Municipios de una provincia. */
router.get("/municipios", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const provinciaId = typeof req.query.provincia === "string" ? req.query.provincia.trim() : "";
    if (!provinciaId) {
      res.status(400).json({ error: "Falta el parámetro provincia." });
      return;
    }
    const municipios = await georef.getMunicipios(provinciaId);
    res.json({ municipios: municipios.map((m) => ({ id: m.id, nombre: m.nombre })) });
  } catch (e) {
    next(e);
  }
});

/** GET /api/locations/localidades?provincia=06&departamento=06427&municipio=060427 — Localidades (departamento y municipio opcionales para acotar). */
router.get("/localidades", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const provinciaId = typeof req.query.provincia === "string" ? req.query.provincia.trim() : "";
    if (!provinciaId) {
      res.status(400).json({ error: "Falta el parámetro provincia." });
      return;
    }
    const departamentoId = typeof req.query.departamento === "string" ? req.query.departamento.trim() || undefined : undefined;
    const municipioId = typeof req.query.municipio === "string" ? req.query.municipio.trim() || undefined : undefined;
    const localidades = await georef.getLocalidades(provinciaId, departamentoId, municipioId);
    res.json({
      localidades: localidades.map((loc) => ({
        id: loc.id,
        nombre: loc.nombre,
        departamento: loc.departamento?.nombre ?? null,
        municipio: loc.municipio?.nombre ?? null,
      })),
    });
  } catch (e) {
    next(e);
  }
});

export default router;
