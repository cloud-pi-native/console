import { z } from 'zod'

export const ExpirationDateSchema = z.coerce.date()
  .refine((value) => {
    const tomorrow = new Date(Date.now())
    tomorrow.setUTCHours(23, 59, 59, 999)
    return value.getTime() > tomorrow.getTime()
  }, { message: 'Date d\'expiration trop courte' })
