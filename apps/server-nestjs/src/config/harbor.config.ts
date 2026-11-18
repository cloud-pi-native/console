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
  HARBOR_ROBOT_ROTATION_THRESHOLD_DAYS: z.coerce.number().int().positive().default(30),
  HARBOR_ROBOT_EXPIRATION_RO_DAYS: z.coerce.number().int().refine(days => days === -1 || days > 0, 'Harbor robot duration must be -1 or a positive number').default(60),
  HARBOR_ROBOT_EXPIRATION_RW_DAYS: z.coerce.number().int().refine(days => days === -1 || days > 0, 'Harbor robot duration must be -1 or a positive number').default(60),
  HARBOR_ROBOT_EXPIRATION_PROJECT_DAYS: z.coerce.number().int().refine(days => days === -1 || days > 0, 'Harbor robot duration must be -1 or a positive number').default(-1),
  HARBOR_PROJECT_SLUG_CACHE_TTL_MS: z.coerce.number().int().positive().default(300_000),
}).superRefine((raw, ctx) => {
  // Rotation must trigger strictly before expiration, otherwise robots die
  // before any secret regeneration had a chance to replace them.
  for (const [robot, days] of [['RO', raw.HARBOR_ROBOT_EXPIRATION_RO_DAYS], ['RW', raw.HARBOR_ROBOT_EXPIRATION_RW_DAYS], ['PROJECT', raw.HARBOR_ROBOT_EXPIRATION_PROJECT_DAYS]] as const) {
    if (days > 0 && raw.HARBOR_ROBOT_ROTATION_THRESHOLD_DAYS >= days) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `HARBOR_ROBOT_ROTATION_THRESHOLD_DAYS (${raw.HARBOR_ROBOT_ROTATION_THRESHOLD_DAYS}) must be strictly lower than HARBOR_ROBOT_EXPIRATION_${robot}_DAYS (${days})`,
      })
    }
  }
}).transform(raw => ({
  url: raw.HARBOR_URL,
  internalUrl: raw.HARBOR_INTERNAL_URL,
  admin: raw.HARBOR_ADMIN,
  adminPassword: raw.HARBOR_ADMIN_PASSWORD,
  ruleTemplate: raw.HARBOR_RULE_TEMPLATE,
  ruleCount: raw.HARBOR_RULE_COUNT,
  retentionCron: raw.HARBOR_RETENTION_CRON,
  robotRotationThresholdDays: raw.HARBOR_ROBOT_ROTATION_THRESHOLD_DAYS,
  robotExpirationRoDays: raw.HARBOR_ROBOT_EXPIRATION_RO_DAYS,
  robotExpirationRwDays: raw.HARBOR_ROBOT_EXPIRATION_RW_DAYS,
  robotExpirationProjectDays: raw.HARBOR_ROBOT_EXPIRATION_PROJECT_DAYS,
  projectSlugCacheTtlMs: raw.HARBOR_PROJECT_SLUG_CACHE_TTL_MS,
}))

export type HarborConfig = z.infer<typeof harborFeatureSchema>

export const harborConfigFactory = registerAs('harbor', () => harborFeatureSchema.parse(process.env))
