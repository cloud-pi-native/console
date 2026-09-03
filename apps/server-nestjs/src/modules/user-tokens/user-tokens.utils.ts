import { isAtLeastTomorrow, PersonalAccessTokenSchema } from '@cpn-console/shared'
import { z } from 'zod'

export const ExpirationDateSchema = z.coerce.date()
  .refine(value => isAtLeastTomorrow(value), { message: 'Date d\'expiration trop courte' })

export const CreatePersonalAccessTokenBodySchema = PersonalAccessTokenSchema
  .pick({ name: true, expirationDate: true })
  .extend({ expirationDate: ExpirationDateSchema })
  .required()
export type CreatePersonalAccessTokenBody = z.infer<typeof CreatePersonalAccessTokenBodySchema>
