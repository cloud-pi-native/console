// import Joi from 'joi'
import type { ZodError, SafeParseReturnType, ZodObject } from 'zod'
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
