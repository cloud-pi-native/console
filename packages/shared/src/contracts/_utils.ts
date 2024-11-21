import type { ZodArray, ZodTypeAny } from 'zod'
import { z } from 'zod'
import { tokenHeaderName } from '../utils/const.js'

export const ErrorSchema = z.lazy(() => z.object({
  message: z.string()
    .optional(),
  error: z.unknown().optional(),
  stack: z.unknown().optional(),
}))

export const baseHeaders = z.object({
  [tokenHeaderName]: z.string().min(1).optional(),
})

export function paginatedData<S extends ZodArray<ZodTypeAny>>(schema: S) {
  return z.object({
    data: schema,
    total: z.number().int(),
    offset: z.number().int(),
  })
}

export const paginateQueries = {
  perPage: z.string().transform(value => z.coerce.number().int().parse(value)),
  page: z.string().transform(value => z.coerce.number().int().parse(value)),
}
