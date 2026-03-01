import { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";

function isDbConnectionError(err: unknown): boolean {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: string }).code;
    if (code === "ECONNREFUSED" || code === "ETIMEDOUT" || code === "ENOTFOUND") return true;
  }
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /connect ECONNREFUSED|connection refused|timeout|5432/i.test(msg);
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }
  if (isDbConnectionError(err)) {
    logger.error({ err }, "Base de datos no disponible");
    res.status(503).json({
      error: "No se pudo conectar a la base de datos. Revisá que PostgreSQL esté corriendo o que el túnel SSH esté activo.",
      code: "DB_UNAVAILABLE",
    });
    return;
  }
  logger.error({ err }, "Error no manejado");
  res.status(500).json({ error: "Error interno del servidor" });
}
