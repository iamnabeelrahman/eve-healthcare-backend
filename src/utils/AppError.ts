export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(code: string, message: string, details?: unknown) {
    return new AppError(400, code, message, details);
  }
  static unauthorized(code: string, message: string) {
    return new AppError(401, code, message);
  }
  static forbidden(code: string, message: string) {
    return new AppError(403, code, message);
  }
  static notFound(code: string, message: string) {
    return new AppError(404, code, message);
  }
  static conflict(code: string, message: string, details?: unknown) {
    return new AppError(409, code, message, details);
  }
  static unprocessable(code: string, message: string, details?: unknown) {
    return new AppError(422, code, message, details);
  }
  static internal(code = 'INTERNAL_ERROR', message = 'Internal server error') {
    return new AppError(500, code, message);
  }
}