import { z } from 'zod'
import { isAtLeastTomorrow } from '../utils/functions.js'

export const CoerceBooleanSchema = z.boolean()
  .or(z.enum(['true', 'false'])
    .transform(value => value === 'true'))

export const dateToString = z.string().or(z.date().transform(date => date.toISOString()))

export const AtDatesToStringExtend = {
  updatedAt: dateToString,
  createdAt: dateToString,
}
// Permissions travel as a decimal string on the wire. Rejecting anything else
// here makes every contract that derives from this schema answer 400 instead
// of letting `BigInt()` blow up with a 500 downstream.
export const permissionLevelSchema = z.coerce.string()
  .refine(value => /^\d+$/.test(value), { message: 'Permissions doit être un entier' })

export const UuidOrCsvUuidSchema = z.string()
  .refine((value) => {
    return !value
      .split(',')
      .some(uuid => !z.string().uuid().safeParse(uuid).success)
  })
  .transform(value => value.split(','))

export const ExpirationDateSchema = z.coerce.date()
  .refine(value => isAtLeastTomorrow(value), { message: 'Date d\'expiration trop courte' })
