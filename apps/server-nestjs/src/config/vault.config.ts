import { registerAs } from '@nestjs/config'
import z from 'zod'
import { optionalUrl, optionalValue } from './config.utils'

const vaultFeatureSchema = z.object({
  VAULT_TOKEN: optionalValue,
  VAULT_URL: optionalUrl,
  VAULT_INTERNAL_URL: optionalUrl,
  VAULT_KV_NAME: z.string().default('forge-dso'),
}).transform((raw) => {
  const urlBase = raw.VAULT_INTERNAL_URL ?? raw.VAULT_URL
  return {
    token: raw.VAULT_TOKEN,
    url: raw.VAULT_URL,
    internalUrl: raw.VAULT_INTERNAL_URL,
    kvName: raw.VAULT_KV_NAME,
    internalOrPublicUrl: urlBase,
    probeUrl: urlBase ? new URL('/v1/sys/health', urlBase).toString() : undefined,
  }
})

export type VaultConfig = z.infer<typeof vaultFeatureSchema>

export const vaultConfigFactory = registerAs('vault', () => vaultFeatureSchema.parse(process.env))
