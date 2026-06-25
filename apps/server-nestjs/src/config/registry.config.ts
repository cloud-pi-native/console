import { registerAs } from '@nestjs/config'
import z from 'zod'
import { flag, nonEmpty, truthySchema } from './config.utils'

const registryFeatureSchema = z.object({
  USE_REGISTRY: flag(truthySchema.default('true')),
  REGISTRY_URL: nonEmpty(z.string().url()),
  REGISTRY_INTERNAL_URL: nonEmpty(z.string().url()),
  REGISTRY_ADMIN: nonEmpty(z.string()),
  REGISTRY_ADMIN_PASSWORD: nonEmpty(z.string()),
  REGISTRY_RULE_TEMPLATE: nonEmpty(z.string()),
  REGISTRY_RULE_COUNT: z.coerce.number().int().nonnegative().optional(),
  REGISTRY_RETENTION_CRON: z.string().default('0 22 2 * * *'),
  REGISTRY_ROBOT_ROTATION_THRESHOLD_DAYS: z.coerce.number().int().positive().default(90),
  REGISTRY_PROJECT_SLUG_CACHE_TTL_MS: z.coerce.number().int().positive().default(300_000),
}).transform(raw => ({
  enabled: raw.USE_REGISTRY,
  url: raw.REGISTRY_URL,
  internalUrl: raw.REGISTRY_INTERNAL_URL,
  admin: raw.REGISTRY_ADMIN,
  adminPassword: raw.REGISTRY_ADMIN_PASSWORD,
  ruleTemplate: raw.REGISTRY_RULE_TEMPLATE,
  ruleCount: raw.REGISTRY_RULE_COUNT,
  retentionCron: raw.REGISTRY_RETENTION_CRON,
  robotRotationThresholdDays: raw.REGISTRY_ROBOT_ROTATION_THRESHOLD_DAYS,
  projectSlugCacheTtlMs: raw.REGISTRY_PROJECT_SLUG_CACHE_TTL_MS,
  internalOrPublicUrl: raw.REGISTRY_INTERNAL_URL || raw.REGISTRY_URL || undefined,
}))

export type RegistryConfig = z.infer<typeof registryFeatureSchema>

export const registryConfigFactory = registerAs('registry', () => registryFeatureSchema.parse(process.env))
