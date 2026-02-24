export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface ApiGatewayV2Event {
  version: string;
  routeKey: string;
  rawPath: string;
  rawQueryString: string;
  requestContext: {
    http: {
      method: string;
      path: string;
    };
    authorizer?: {
      jwt?: {
        claims: Record<string, string>;
      };
    };
  };
  pathParameters?: Record<string, string>;
  queryStringParameters?: Record<string, string>;
  body?: string;
  headers?: Record<string, string>;
}

export interface ApiResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

export function jsonResponse(statusCode: number, data: unknown): ApiResponse {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
    },
    body: JSON.stringify(data),
  };
}

export function getUserId(event: ApiGatewayV2Event): string | null {
  return event.requestContext.authorizer?.jwt?.claims?.sub ?? null;
}

export function parseBody<T>(body: string | undefined): T | null {
  if (!body) return null;
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

export function errorToResponse(e: unknown): ApiResponse {
  const err = e as { statusCode?: number; message?: string };
  const statusCode =
    typeof err?.statusCode === "number" ? err.statusCode : 500;
  const message = err?.message ?? "Internal server error";
  return jsonResponse(statusCode, { error: message });
}
