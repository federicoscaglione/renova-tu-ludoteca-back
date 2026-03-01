import { Request, Response, NextFunction } from "express";
import jwksRsa from "jwks-rsa";
import jwt from "jsonwebtoken";
import { config } from "../config/index";
import { UnauthorizedError } from "../lib/errors";
import { logger } from "../lib/logger";

declare global {
  namespace Express {
    interface Request {
      userId?: string | null;
    }
  }
}

const jwksUri = `https://cognito-idp.${config.cognito.region}.amazonaws.com/${config.cognito.userPoolId}/.well-known/jwks.json`;

/** Timeout corto para no bloquear peticiones si Cognito tarda (p. ej. primera vez o red lenta). */
const JWKS_TIMEOUT_MS = 10_000;

const client = jwksRsa({
  jwksUri,
  cache: true,
  rateLimit: true,
  timeout: JWKS_TIMEOUT_MS,
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback): void {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

/** Require valid Cognito JWT; sets req.userId to sub. */
export function authRequired(req: Request, _res: Response, next: NextFunction): void {
  const authStart = Date.now();
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    next(new UnauthorizedError("Falta o es inválido el encabezado de autorización"));
    return;
  }
  jwt.verify(token, getKey, { algorithms: ["RS256"] }, (err, decoded) => {
    const authMs = Date.now() - authStart;
    logger.info({ authMs }, "/api/me: auth (JWT+JWKS)");
    if (err) {
      const msg = err.message?.toLowerCase().includes("expired")
        ? "Token expirado"
        : "Token inválido";
      next(new UnauthorizedError(msg));
      return;
    }
    const payload = decoded as { sub?: string };
    req.userId = payload.sub ?? null;
    next();
  });
}

/** Optional auth: if Bearer present and valid, sets req.userId; otherwise req.userId = null. */
export function authOptional(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    req.userId = null;
    next();
    return;
  }
  jwt.verify(token, getKey, { algorithms: ["RS256"] }, (err, decoded) => {
    if (err) {
      req.userId = null;
    } else {
      const payload = decoded as { sub?: string };
      req.userId = payload.sub ?? null;
    }
    next();
  });
}

/** Precalienta la caché de claves JWKS al arrancar (todas las kids) para que la primera petición /api/me no espere a Cognito. */
export function warmJwksCache(): void {
  fetch(jwksUri)
    .then((res) => res.json() as Promise<{ keys?: Array<{ kid?: string }> }>)
    .then(async (json) => {
      const kids = (json.keys ?? []).map((k) => k.kid).filter(Boolean) as string[];
      for (const kid of kids) {
        await new Promise<void>((resolve, reject) => {
          client.getSigningKey(kid, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
    })
    .then(() => logger.info("Caché JWKS precalentada"))
    .catch((err) => logger.warn({ err }, "No se pudo precalentar la caché JWKS"));
}
