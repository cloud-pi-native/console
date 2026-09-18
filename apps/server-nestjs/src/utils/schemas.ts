import { isAtLeastTomorrow } from '@cpn-console/shared'
import { z } from 'zod'

export const CoerceBooleanSchema = z.boolean()
  .or(z.enum(['true', 'false'])
    .transform(value => value === 'true'))

export const ExpirationDateSchema = z.coerce.date()
  .refine(value => isAtLeastTomorrow(value), { message: 'Date d\'expiration trop courte' })
