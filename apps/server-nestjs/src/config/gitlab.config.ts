import { registerAs } from '@nestjs/config'
import z from 'zod'
import { truthySchema } from './config.utils'

const gitlabFeatureSchema = z.object({
  GITLAB_TOKEN: z.string().min(1),
  GITLAB_URL: z.string().url(),
  GITLAB_INTERNAL_URL: z.string().url().optional(),
  GITLAB_MIRROR_TOKEN_EXPIRATION_DAYS: z.coerce.number().int().positive().default(365),
  GITLAB_MIRROR_TOKEN_ROTATION_THRESHOLD_DAYS: z.coerce.number().int().positive().default(250),
  GITLAB__SECRET_EXPOSE_INTERNAL_URL: truthySchema.default('false').transform(v => v === 'true' || v === '1'),
  PROJECTS_ROOT_DIR: z.string().min(1),
}).superRefine((raw, ctx) => {
  // Rotation must trigger strictly before expiration, otherwise tokens die
  // before any regeneration had a chance to replace them.
  if (raw.GITLAB_MIRROR_TOKEN_ROTATION_THRESHOLD_DAYS >= raw.GITLAB_MIRROR_TOKEN_EXPIRATION_DAYS) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `GITLAB_MIRROR_TOKEN_ROTATION_THRESHOLD_DAYS (${raw.GITLAB_MIRROR_TOKEN_ROTATION_THRESHOLD_DAYS}) must be strictly lower than GITLAB_MIRROR_TOKEN_EXPIRATION_DAYS (${raw.GITLAB_MIRROR_TOKEN_EXPIRATION_DAYS})`,
    })
  }
}).transform(raw => ({
  token: raw.GITLAB_TOKEN,
  url: raw.GITLAB_URL,
  internalUrl: raw.GITLAB_INTERNAL_URL,
  secretExposeInternalUrl: raw.GITLAB__SECRET_EXPOSE_INTERNAL_URL,
  mirrorTokenExpirationDays: raw.GITLAB_MIRROR_TOKEN_EXPIRATION_DAYS,
  mirrorTokenRotationThresholdDays: raw.GITLAB_MIRROR_TOKEN_ROTATION_THRESHOLD_DAYS,
  projectRootDir: raw.PROJECTS_ROOT_DIR,
}))

export type GitlabConfig = z.infer<typeof gitlabFeatureSchema>

export const gitlabConfigFactory = registerAs('gitlab', () => gitlabFeatureSchema.parse(process.env))
