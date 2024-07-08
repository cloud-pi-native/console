import { z } from 'zod'

export const ErrorSchema = z.object({
  message: z.string()
    .optional(),
  error: z.unknown(),
  stack: z.unknown(),
})

const dateToString = z.string().or(z.date().transform(date => date.toISOString()))
export const AtDatesToStringExtend = {
  updatedAt: dateToString,
  createdAt: dateToString,
}
