export class ErrorResType {
  status: 400 | 403 | 404 | 422
  body: { message: string } = { message: '' }
  constructor(code: 400 | 403 | 404 | 422) {
    this.status = code
  }
}
export class BadRequest400 extends ErrorResType {
  status = 400 as const
  constructor(message: string) {
    super(400)
    this.body.message = message ?? 'Bad request'
  }
}

export class Forbidden403 extends ErrorResType {
  status = 403 as const
  constructor(message?: string) {
    super(403)
    this.body.message = message ?? 'Forbidden'
  }
}

export class NotFound404 extends ErrorResType {
  status = 404 as const
  constructor() {
    super(404)
    this.body.message = 'Not Found'
  }
}

export class Unprocessable422 extends ErrorResType {
  status = 422 as const
  constructor(message?: string) {
    super(422)
    this.body.message = message ?? 'Unprocessable Entity'
  }
}
