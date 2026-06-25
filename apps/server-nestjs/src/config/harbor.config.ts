import { registerAs } from '@nestjs/config'
import z from 'zod'
import { cronSchema } from './config.utils'

const ruleTemplateSchema = z.enum([
  'always',
  'latestPulledK',
  'latestPushedK',
  'nDaysSinceLastPull',
  'nDaysSinceLastPush',
])

export type RuleTemplate = z.infer<typeof ruleTemplateSchema>

const harborFeatureSchema = z.object({
  HARBOR_URL: z.string().url(),
  HARBOR_INTERNAL_URL: z.string().url().optional(),
  HARBOR_ADMIN: z.string().min(1),
  HARBOR_ADMIN_PASSWORD: z.string().min(1),
  HARBOR_RULE_TEMPLATE: ruleTemplateSchema.optional(),
  HARBOR_RULE_COUNT: z.coerce.number().int().positive().optional(),
  HARBOR_RETENTION_CRON: cronSchema.default('0 22 2 * * *'),
  HARBOR_ROBOT_ROTATION_THRESHOLD_DAYS: z.coerce.number().int().positive().default(90),
  HARBOR_PROJECT_SLUG_CACHE_TTL_MS: z.coerce.number().int().positive().default(300_000),
}).transform((raw) => {
  const urlBase = raw.HARBOR_INTERNAL_URL ?? raw.HARBOR_URL
  return {
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
    probeUrl: new URL('/api/v2.0/ping', urlBase).toString(),
  }
})

export type HarborConfig = z.infer<typeof harborFeatureSchema>

export const harborConfigFactory = registerAs('harbor', () => harborFeatureSchema.parse(process.env))
