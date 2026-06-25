import { Inject } from '@nestjs/common'
import { registerAs } from '@nestjs/config'
import z from 'zod'

const flagSchema = z
  .preprocess(val => (val === undefined ? 'false' : val), z.enum(['true', 'false', '']))
  .transform(val => val === 'true')
  .default(false)

const optionalUrl = (schema: z.ZodString) => schema.url().optional().or(z.literal('').transform(() => undefined))

const vaultFeatureSchema = z.object({
  USE_VAULT: flagSchema.default(true),
  VAULT_TOKEN: z.string().optional(),
  VAULT_URL: optionalUrl(z.string()).optional(),
  VAULT_INTERNAL_URL: optionalUrl(z.string()).optional(),
  VAULT_KV_NAME: z.string().default('forge-dso'),
})

export type VaultRawConfig = z.infer<typeof vaultFeatureSchema>

export interface VaultConfig {
  useVault: boolean
  vaultToken: string | undefined
  vaultUrl: string | undefined
  vaultInternalUrl: string | undefined
  vaultKvName: string
  internalOrPublicVaultUrl: string | undefined
}

function toVaultConfig(raw: VaultRawConfig): VaultConfig {
  return {
    useVault: raw.USE_VAULT,
    vaultToken: raw.VAULT_TOKEN,
    vaultUrl: raw.VAULT_URL,
    vaultInternalUrl: raw.VAULT_INTERNAL_URL,
    vaultKvName: raw.VAULT_KV_NAME,
    internalOrPublicVaultUrl: raw.VAULT_INTERNAL_URL || raw.VAULT_URL || undefined,
  }
}

export const KEY = 'vault' as const

export const vaultConfigFactory = registerAs(KEY, () =>
  toVaultConfig(vaultFeatureSchema.parse({
    USE_VAULT: process.env.USE_VAULT,
    VAULT_TOKEN: process.env.VAULT_TOKEN,
    VAULT_URL: process.env.VAULT_URL,
    VAULT_INTERNAL_URL: process.env.VAULT_INTERNAL_URL,
    VAULT_KV_NAME: process.env.VAULT_KV_NAME,
  })))

export const InjectVaultConfig = () => Inject(vaultConfigFactory.KEY)

export default vaultConfigFactory
