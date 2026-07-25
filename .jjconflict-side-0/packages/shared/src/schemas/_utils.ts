import { z } from 'zod'

export const CoerceBooleanSchema = z.boolean()
  .or(z.enum(['true', 'false'])
    .transform(value => value === 'true'))

export const dateToString = z.string().or(z.date().transform(date => date.toISOString()))

export const AtDatesToStringExtend = {
  updatedAt: dateToString,
  createdAt: dateToString,
}
export const permissionLevelSchema = z.coerce.string()

export const UuidOrCsvUuidSchema = z.string()
  .refine((value) => {
    return !value
      .split(',')
      .some(uuid => !z.string().uuid().safeParse(uuid).success)
  })
  .transform(value => value.split(','))
