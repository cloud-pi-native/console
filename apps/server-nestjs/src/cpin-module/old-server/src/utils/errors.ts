export class ErrorResType {
    readonly status: 400 | 401 | 403 | 404 | 422 | 500;
    body: { message: string } = { message: '' };
    constructor(code: 400 | 401 | 403 | 404 | 422 | 500) {
        this.status = code;
    }
}
export class BadRequest400 extends ErrorResType {
    constructor(message: string) {
        super(400);
        this.body.message = message ?? 'Bad Request';
    }
}

export class Unauthorized401 extends ErrorResType {
    constructor(message?: string) {
        super(401);
        this.body.message = message ?? 'Unauthorized';
    }
}

export class Forbidden403 extends ErrorResType {
    constructor(message?: string) {
        super(403);
        this.body.message = message ?? 'Forbidden';
    }
}

export class NotFound404 extends ErrorResType {
    constructor() {
        super(404);
        this.body.message = 'Not Found';
    }
}

export class Unprocessable422 extends ErrorResType {
    constructor(message?: string) {
        super(422);
        this.body.message = message ?? 'Unprocessable Entity';
    }
}

export class Internal500 extends ErrorResType {
    constructor(message: string) {
        super(500);
        this.body.message = message;
    }
}
