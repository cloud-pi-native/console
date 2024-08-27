// import Joi from 'joi'
import { type SafeParseReturnType, type ZodError, type ZodObject, z } from 'zod'
import { fromZodError } from 'zod-validation-error'

export type SharedZodError = ZodError
export type SharedSafeParseReturnType = SafeParseReturnType<unknown, unknown>
export const parseZodError = (zodError: ZodError) => fromZodError(zodError).toString()

export function instanciateSchema<T extends ZodObject<any>, V extends boolean>(schema: T, value: V): Record<keyof T['_type'], V | boolean> {
  const keys = schema.keyof()._def.values
  // @ts-ignore
  if (keys.length) {
    // @ts-ignore
    const entries = schema.keyof()._def.values?.map(key => [key, value])
    // @ts-ignore
    return Object.fromEntries(entries)
  }
  // @ts-ignore
  return {}
}

export const CoerceBooleanSchema = z.boolean()
  .or(z.enum(['true', 'false'])
    .transform(value => value === 'true'))
