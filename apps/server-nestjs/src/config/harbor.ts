import { Inject } from '@nestjs/common'
import { registerAs } from '@nestjs/config'
import z from 'zod'

const flagSchema = z
  .preprocess(val => (val === undefined ? 'false' : val), z.enum(['true', 'false', '']))
  .transform(val => val === 'true')
  .default(false)

const optionalUrl = (schema: z.ZodString) => schema.url().optional().or(z.literal('').transform(() => undefined))

const harborFeatureSchema = z.object({
  USE_HARBOR: flagSchema.default(true),
  HARBOR_URL: optionalUrl(z.string()).optional(),
  HARBOR_INTERNAL_URL: optionalUrl(z.string()).optional(),
  HARBOR_ADMIN: z.string().min(1, 'HARBOR_ADMIN is required'),
  HARBOR_ADMIN_PASSWORD: z.string().min(1, 'HARBOR_ADMIN_PASSWORD is required'),
  HARBOR_RULE_TEMPLATE: z.string().min(1).optional(),
  HARBOR_RULE_COUNT: z.coerce.number().int().nonnegative().optional(),
  HARBOR_RETENTION_CRON: z.string().default('0 22 2 * * *'),
  HARBOR_ROBOT_ROTATION_THRESHOLD_DAYS: z.coerce.number().int().positive().default(90),
  HARBOR_PROJECT_SLUG_CACHE_TTL_MS: z.coerce.number().int().positive().default(300_000),
})

export type HarborRawConfig = z.infer<typeof harborFeatureSchema>

export interface HarborConfig {
  useHarbor: boolean
  harborUrl: string | undefined
  harborInternalUrl: string | undefined
  harborAdmin: string
  harborAdminPassword: string
  harborRuleTemplate: string | undefined
  harborRuleCount: number | undefined
  harborRetentionCron: string
  harborRobotRotationThresholdDays: number
  harborProjectSlugCacheTtlMs: number
  internalOrPublicHarborUrl: string | undefined
}

function toHarborConfig(raw: HarborRawConfig): HarborConfig {
  return {
    useHarbor: raw.USE_HARBOR,
    harborUrl: raw.HARBOR_URL,
    harborInternalUrl: raw.HARBOR_INTERNAL_URL,
    harborAdmin: raw.HARBOR_ADMIN,
    harborAdminPassword: raw.HARBOR_ADMIN_PASSWORD,
    harborRuleTemplate: raw.HARBOR_RULE_TEMPLATE,
    harborRuleCount: raw.HARBOR_RULE_COUNT,
    harborRetentionCron: raw.HARBOR_RETENTION_CRON,
    harborRobotRotationThresholdDays: raw.HARBOR_ROBOT_ROTATION_THRESHOLD_DAYS,
    harborProjectSlugCacheTtlMs: raw.HARBOR_PROJECT_SLUG_CACHE_TTL_MS,
    internalOrPublicHarborUrl: raw.HARBOR_INTERNAL_URL || raw.HARBOR_URL || undefined,
  }
}

export const KEY = 'harbor' as const

export const harborConfigFactory = registerAs(KEY, () =>
  toHarborConfig(harborFeatureSchema.parse({
    USE_HARBOR: process.env.USE_HARBOR,
    HARBOR_URL: process.env.HARBOR_URL,
    HARBOR_INTERNAL_URL: process.env.HARBOR_INTERNAL_URL,
    HARBOR_ADMIN: process.env.HARBOR_ADMIN,
    HARBOR_ADMIN_PASSWORD: process.env.HARBOR_ADMIN_PASSWORD,
    HARBOR_RULE_TEMPLATE: process.env.HARBOR_RULE_TEMPLATE,
    HARBOR_RULE_COUNT: process.env.HARBOR_RULE_COUNT,
    HARBOR_RETENTION_CRON: process.env.HARBOR_RETENTION_CRON,
    HARBOR_ROBOT_ROTATION_THRESHOLD_DAYS: process.env.HARBOR_ROBOT_ROTATION_THRESHOLD_DAYS,
    HARBOR_PROJECT_SLUG_CACHE_TTL_MS: process.env.HARBOR_PROJECT_SLUG_CACHE_TTL_MS,
  })))

export const InjectHarborConfig = () => Inject(harborConfigFactory.KEY)

export default harborConfigFactory
