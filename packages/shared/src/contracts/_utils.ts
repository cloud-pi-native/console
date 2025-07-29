import { z } from 'zod'
import { tokenHeaderName } from '../utils/const'

export const ErrorSchema = z.lazy(() => z.object({
  message: z.string()
    .optional(),
  error: z.unknown().optional(),
  stack: z.unknown().optional(),
}))

export const baseHeaders = z.object({
  [tokenHeaderName]: z.string().min(1).optional(),
})
