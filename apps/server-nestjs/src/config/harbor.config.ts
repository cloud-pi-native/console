import type { HarborConfig } from '../modules/registry/harbor.module-definition'
import { registerAs } from '@nestjs/config'
import z from 'zod'
import { flag, nonEmpty, truthySchema } from './config.utils'

const harborFeatureSchema = z.object({
  USE_HARBOR: flag(truthySchema.default('true')),
  HARBOR_URL: nonEmpty(z.string().url()),
  HARBOR_INTERNAL_URL: nonEmpty(z.string().url()),
  HARBOR_ADMIN: z.string().min(1, 'HARBOR_ADMIN is required'),
  HARBOR_ADMIN_PASSWORD: z.string().min(1, 'HARBOR_ADMIN_PASSWORD is required'),
  HARBOR_RULE_TEMPLATE: z.string().min(1).optional(),
  HARBOR_RULE_COUNT: z.string().optional(),
  HARBOR_RETENTION_CRON: z.string().default('0 22 2 * * *'),
  HARBOR_ROBOT_ROTATION_THRESHOLD_DAYS: z.coerce.number().int().positive().default(90),
  HARBOR_PROJECT_SLUG_CACHE_TTL_MS: z.coerce.number().int().positive().default(300_000),
}).transform((raw) => {
  const urlBase = raw.HARBOR_INTERNAL_URL || raw.HARBOR_URL || undefined
  return {
    enabled: raw.USE_HARBOR,
    url: raw.HARBOR_URL,
    internalUrl: raw.HARBOR_INTERNAL_URL,
    admin: raw.HARBOR_ADMIN,
    adminPassword: raw.HARBOR_ADMIN_PASSWORD,
    ruleTemplate: raw.HARBOR_RULE_TEMPLATE,
    ruleCount: raw.HARBOR_RULE_COUNT,
    retentionCron: raw.HARBOR_RETENTION_CRON,
    robotRotationThresholdDays: raw.HARBOR_ROBOT_ROTATION_THRESHOLD_DAYS,
    projectSlugCacheTtlMs: raw.HARBOR_PROJECT_SLUG_CACHE_TTL_MS,
    internalOrPublicUrl: urlBase,
    probeUrl: urlBase ? new URL('/api/v2.0/health', urlBase).toString() : undefined,
  }
})

export type HarborAppConfig = HarborConfig

export const harborConfigFactory = registerAs('harbor', () => harborFeatureSchema.parse(process.env))
