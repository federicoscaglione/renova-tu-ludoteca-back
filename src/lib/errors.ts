export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "No autorizado") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Acceso denegado") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "No encontrado") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Solicitud incorrecta") {
    super(message, 400, "BAD_REQUEST");
    this.name = "BadRequestError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflicto") {
    super(message, 409, "CONFLICT");
    this.name = "ConflictError";
  }
}
