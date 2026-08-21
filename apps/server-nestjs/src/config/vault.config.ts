import { registerAs } from '@nestjs/config'
import z from 'zod'
import { urlSchema } from './config.utils'

const vaultFeatureSchema = z.object({
  VAULT_TOKEN: z.string().min(1),
  VAULT_URL: urlSchema,
  VAULT_INTERNAL_URL: urlSchema.optional(),
  VAULT_KV_NAME: z.string().default('forge-dso'),
}).transform(raw => ({
  token: raw.VAULT_TOKEN,
  url: raw.VAULT_URL,
  internalUrl: raw.VAULT_INTERNAL_URL,
  kvName: raw.VAULT_KV_NAME,
}))

export type VaultConfig = z.infer<typeof vaultFeatureSchema>

export const vaultConfigFactory = registerAs('vault', () => vaultFeatureSchema.parse(process.env))
