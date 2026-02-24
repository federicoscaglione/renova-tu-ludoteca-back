import type { z, ZodType } from "zod";
import type { ApiGatewayV2Event } from "./api";
import { BadRequestError } from "./errors";

/**
 * Parsea el body JSON y lo valida con el esquema Zod.
 * Lanza BadRequestError si el body es inválido o no cumple el esquema.
 */
export function validateBody<T extends ZodType>(
  body: string | undefined,
  schema: T
): z.infer<T> {
  let parsed: unknown;
  try {
    parsed = body ? JSON.parse(body) : undefined;
  } catch {
    throw new BadRequestError("Invalid JSON body");
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    const first = result.error.flatten().formErrors[0]
      ?? result.error.errors[0]?.message
      ?? "Validation failed";
    throw new BadRequestError(first);
  }
  return result.data as z.infer<T>;
}

/**
 * Como validateBody pero trata body ausente o vacío como {}.
 * Útil para PUT/PATCH donde todos los campos son opcionales.
 */
export function validateBodyOptional<T extends ZodType>(
  body: string | undefined,
  schema: T
): z.infer<T> {
  let parsed: unknown;
  try {
    parsed = body && body.trim() ? JSON.parse(body) : {};
  } catch {
    throw new BadRequestError("Invalid JSON body");
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    const first = result.error.flatten().formErrors[0]
      ?? result.error.errors[0]?.message
      ?? "Validation failed";
    throw new BadRequestError(first);
  }
  return result.data as z.infer<T>;
}

/**
 * Obtiene un path parameter requerido. Lanza BadRequestError si falta o está vacío.
 */
export function requirePathParam(
  event: ApiGatewayV2Event,
  name: string
): string {
  const value = event.pathParameters?.[name]?.trim();
  if (!value) {
    throw new BadRequestError(`Missing or empty path parameter: ${name}`);
  }
  return value;
}

/**
 * Obtiene un query parameter opcional (string).
 */
export function optionalQueryParam(
  event: ApiGatewayV2Event,
  name: string
): string | undefined {
  return event.queryStringParameters?.[name]?.trim();
}

/**
 * Valida un query param con un esquema Zod (ej. para sellerId, gameId).
 */
export function validateQuery<T extends ZodType>(
  event: ApiGatewayV2Event,
  schema: T
): z.infer<T> {
  const parsed = event.queryStringParameters ?? {};
  const result = schema.safeParse(parsed);
  if (!result.success) {
    const first = result.error.flatten().formErrors[0]
      ?? result.error.errors[0]?.message
      ?? "Invalid query parameters";
    throw new BadRequestError(first);
  }
  return result.data as z.infer<T>;
}
