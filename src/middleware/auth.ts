import { Request, Response, NextFunction } from "express";
import jwksRsa from "jwks-rsa";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { UnauthorizedError } from "../lib/errors.js";

declare global {
  namespace Express {
    interface Request {
      userId?: string | null;
    }
  }
}

const jwksUri = `https://cognito-idp.${config.cognito.region}.amazonaws.com/${config.cognito.userPoolId}/.well-known/jwks.json`;
const client = jwksRsa({ jwksUri, cache: true, rateLimit: true });

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback): void {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

/** Require valid Cognito JWT; sets req.userId to sub. */
export function authRequired(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    next(new UnauthorizedError("Missing or invalid Authorization header"));
    return;
  }
  jwt.verify(token, getKey, { algorithms: ["RS256"] }, (err, decoded) => {
    if (err) {
      next(new UnauthorizedError(err.message));
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
