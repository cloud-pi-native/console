class DsoError extends Error {
  public description: string
  public extras: Record<string, string>
  public statusCode: number

  constructor (message: string, data) {
    super(message)
    this.description = data.description
    this.extras = data.extras
  }
}

class BadRequestError extends DsoError {
  statusCode = 400
}

class UnauthorizedError extends DsoError {
  statusCode = 401
}

class ForbiddenError extends DsoError {
  statusCode = 403
}

class NotFoundError extends DsoError {
  statusCode = 404
}

class ConflictError extends DsoError {
  statusCode = 409
}

class TooManyRequestError extends DsoError {
  statusCode = 429
}

class ServerError extends DsoError {
  statusCode = 500
}

export {
  DsoError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestError,
  ServerError,
}
