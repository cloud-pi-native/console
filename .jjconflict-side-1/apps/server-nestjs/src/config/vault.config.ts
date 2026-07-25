import { registerAs } from '@nestjs/config'
import z from 'zod'

const vaultFeatureSchema = z.object({
  VAULT_TOKEN: z.string().min(1),
  VAULT_URL: z.string().url(),
  VAULT_INTERNAL_URL: z.string().url().optional(),
  VAULT_KV_NAME: z.string().default('forge-dso'),
}).transform((raw) => {
  const urlBase = raw.VAULT_INTERNAL_URL ?? raw.VAULT_URL
  return {
    token: raw.VAULT_TOKEN,
    url: raw.VAULT_URL,
    internalUrl: raw.VAULT_INTERNAL_URL,
    kvName: raw.VAULT_KV_NAME,
    internalOrPublicUrl: urlBase,
    probeUrl: new URL('/v1/sys/health', urlBase).toString(),
  }
})

export const vaultConfigFactory = registerAs('vault', () => vaultFeatureSchema.parse(process.env))
