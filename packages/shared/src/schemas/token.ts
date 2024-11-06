import { z } from 'zod'
import { UserSchema } from './user.js'
import { dateToString, permissionLevelSchema } from './_utils.js'

export const TokenSchema = z.object({
  id: z.string().uuid(),
  name: z.string()
    .max(32, { message: 'Ne peut dépasser 32 caractères' })
    .min(2, { message: 'Ne peut faire moins de 2 caractères' })
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, { message: 'Le nom ne peut être constitué que de caractères minuscules, de chiffres et de tirets (-)' }),
  lastUse: dateToString.nullable(),
  expirationDate: dateToString.nullable(),
  createdAt: dateToString,
  owner: UserSchema
    .pick({ email: true, firstName: true, lastName: true, id: true, type: true })
    .optional()
    .nullable(),
  status: z.enum(['active', 'revoked', 'inactive']),
})

export const AdminTokenSchema = TokenSchema.extend({
  permissions: permissionLevelSchema,
})

export const ExposedAdminTokenSchema = AdminTokenSchema.extend({
  password: z.string(),
})

export type AdminToken = Zod.infer<typeof AdminTokenSchema>
export type ExposedAdminToken = Zod.infer<typeof ExposedAdminTokenSchema>
