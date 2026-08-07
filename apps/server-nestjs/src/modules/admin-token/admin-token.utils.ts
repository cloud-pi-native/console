import type { z } from 'zod'
import { AdminTokenSchema } from '@cpn-console/shared'
import { ExpirationDateSchema } from '../../utils/schemas.js'

export const CreateAdminTokenBodySchema = AdminTokenSchema
  .pick({ name: true, permissions: true, expirationDate: true })
  .extend({ expirationDate: ExpirationDateSchema.nullable() })
  .required()
export type CreateAdminTokenBody = z.infer<typeof CreateAdminTokenBodySchema>
