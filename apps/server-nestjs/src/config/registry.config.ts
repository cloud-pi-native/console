import { registerAs } from '@nestjs/config'
import z from 'zod'

const registryFeatureSchema = z.object({
  REGISTRY_URL: z.string().url(),
  REGISTRY_INTERNAL_URL: z.string().url().optional(),
  REGISTRY_ADMIN: z.string().min(1),
  REGISTRY_ADMIN_PASSWORD: z.string().min(1),
  REGISTRY_RULE_TEMPLATE: z.string().min(1),
  REGISTRY_RULE_COUNT: z.coerce.number().int().nonnegative().optional(),
  REGISTRY_RETENTION_CRON: z.string().default('0 22 2 * * *'),
  REGISTRY_ROBOT_ROTATION_THRESHOLD_DAYS: z.coerce.number().int().positive().default(90),
  REGISTRY_PROJECT_SLUG_CACHE_TTL_MS: z.coerce.number().int().positive().default(300_000),
}).transform((raw) => {
  const urlBase = raw.REGISTRY_INTERNAL_URL ?? raw.REGISTRY_URL
  return {
    url: raw.REGISTRY_URL,
    internalUrl: raw.REGISTRY_INTERNAL_URL,
    admin: raw.REGISTRY_ADMIN,
    adminPassword: raw.REGISTRY_ADMIN_PASSWORD,
    ruleTemplate: raw.REGISTRY_RULE_TEMPLATE,
    ruleCount: raw.REGISTRY_RULE_COUNT,
    retentionCron: raw.REGISTRY_RETENTION_CRON,
    robotRotationThresholdDays: raw.REGISTRY_ROBOT_ROTATION_THRESHOLD_DAYS,
    projectSlugCacheTtlMs: raw.REGISTRY_PROJECT_SLUG_CACHE_TTL_MS,
    internalOrPublicUrl: urlBase,
  }
})

export type RegistryConfig = z.infer<typeof registryFeatureSchema>

export const registryConfigFactory = registerAs('registry', () => registryFeatureSchema.parse(process.env))
