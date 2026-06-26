import type { z } from 'zod'
import { PersonalAccessTokenSchema } from '@cpn-console/shared'
import { ExpirationDateSchema } from '../../utils/schemas.js'

export const CreatePersonalAccessTokenBodySchema = PersonalAccessTokenSchema
  .pick({ name: true, expirationDate: true })
  .extend({ expirationDate: ExpirationDateSchema })
  .required()
export type CreatePersonalAccessTokenBody = z.infer<typeof CreatePersonalAccessTokenBodySchema>
