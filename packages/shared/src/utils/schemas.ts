// import Joi from 'joi'
import { type ZodError, type SafeParseReturnType, type ZodObject, z } from 'zod'
import { fromZodError } from 'zod-validation-error'

export type SharedZodError = ZodError
export type SharedSafeParseReturnType = SafeParseReturnType<unknown, unknown>
export const parseZodError = (zodError: ZodError) => fromZodError(zodError).toString()

export const instanciateSchema = (schema: ZodObject<any>, value: unknown) => {
  const keys = schema.keyof()._def.values
  // @ts-ignore
  if (keys.length) {
    // @ts-ignore
    const entries = schema.keyof()._def.values?.map(key => [key, value])
    return Object.fromEntries(entries)
  }
  return {}
}

export const CoerceBooleanSchema = z.boolean()
  .or(z.enum(['true', 'false'])
    .transform((value) => value === 'true'))
