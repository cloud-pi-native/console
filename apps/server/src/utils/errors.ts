type DsoErrorData = {
  description?: string
  extras?: Record<string, any>
}
class DsoError extends Error {
  public description: string
  public extras: Record<string, string>
  public statusCode: number

  constructor(message: string, data?: DsoErrorData) {
    super(message)
    this.description = data?.description || message
    this.extras = data?.extras || {}
    this.statusCode = 500
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

class UnprocessableContentError extends DsoError {
  statusCode = 422
}

class TooManyRequestError extends DsoError {
  statusCode = 429
}

export {
  DsoError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnprocessableContentError,
  TooManyRequestError,
}
