import {
    type SharedSafeParseReturnType,
    parseZodError,
} from '@cpn-console/shared';

import { BadRequest400 } from './errors.js';

export type Success<T> = Result<T>;
export type Failure = Result<never>;
export class Result<T> {
    protected constructor(
        readonly success: boolean,
        readonly value: T | string,
    ) {}

    static succeed<T>(value: T): Success<T> {
        return new Result(true, value) as Success<T>;
    }

    static fail(message: string): Failure {
        return new Result(false, message) as Failure;
    }

    get isSuccess(): boolean {
        return this.success;
    }

    get isError(): boolean {
        return !this.success;
    }

    get data(): T {
        if (this.success) return this.value as T;
        throw new Error('Cannot get data from a Failure');
    }

    get error(): string {
        if (!this.success) return this.value as string;
        throw new Error('Cannot get error from a Success');
    }
}

export function validateSchema(schemaValidation: SharedSafeParseReturnType) {
    if (!schemaValidation.success)
        return new BadRequest400(parseZodError(schemaValidation.error));
}
