// import Joi from 'joi'
import type { SafeParseReturnType, ZodError, ZodObject, ZodRawShape } from 'zod'
import { fromZodError } from 'zod-validation-error'

export type SharedZodError = ZodError
export type SharedSafeParseReturnType = SafeParseReturnType<unknown, unknown>
export const parseZodError = (zodError: ZodError) => fromZodError(zodError).toString()

export function instanciateSchema<T extends ZodObject<ZodRawShape>, V extends boolean>(schema: T, value: V): Record<keyof T['_type'], V | boolean> {
  const keys = Object.keys(schema.shape)
  if (keys.length) {
    const entries = keys.map(key => [key, value])
    return Object.fromEntries(entries) as Record<keyof T['_type'], V | boolean>
  }
  return {} as Record<keyof T['_type'], V | boolean>
}
