import { z } from 'zod'

export const ErrorSchema = z.object({
  message: z.string()
    .optional(),
  error: z.unknown().optional(),
  stack: z.unknown().optional(),
})

export const dateToString = z.string().or(z.date().transform(date => date.toISOString()))
export const AtDatesToStringExtend = {
  updatedAt: dateToString,
  createdAt: dateToString,
}

export const UuidOrCsvUuidSchema = z.string()
  .refine((value) => {
    return !value
      .split(',')
      .some(uuid => !z.string().uuid().safeParse(uuid).success)
  })
  .transform(value => value.split(','))
