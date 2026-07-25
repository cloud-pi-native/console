import { registerAs } from '@nestjs/config'
import z from 'zod'
import { flag, nonEmpty, truthySchema } from './config.utils'

const gitlabFeatureSchema = z.object({
  USE_GITLAB: flag(truthySchema.default('true')),
  GITLAB_TOKEN: z.string().optional(),
  GITLAB_URL: nonEmpty(z.string().url()),
  GITLAB_INTERNAL_URL: nonEmpty(z.string().url()),
  GITLAB_MIRROR_TOKEN_EXPIRATION_DAYS: z.coerce.number().int().positive().default(180),
  GITLAB_MIRROR_TOKEN_ROTATION_THRESHOLD_DAYS: z.coerce.number().int().positive().default(90),
  PROJECTS_ROOT_DIR: nonEmpty(z.string()),
}).transform((raw) => {
  const urlBase = raw.GITLAB_INTERNAL_URL || raw.GITLAB_URL || undefined
  return {
    enabled: raw.USE_GITLAB,
    token: raw.GITLAB_TOKEN,
    url: raw.GITLAB_URL,
    internalUrl: raw.GITLAB_INTERNAL_URL,
    mirrorTokenExpirationDays: raw.GITLAB_MIRROR_TOKEN_EXPIRATION_DAYS,
    mirrorTokenRotationThresholdDays: raw.GITLAB_MIRROR_TOKEN_ROTATION_THRESHOLD_DAYS,
    projectRootDir: raw.PROJECTS_ROOT_DIR,
    internalOrPublicUrl: urlBase,
    probeUrl: urlBase ? new URL('/-/health', urlBase).toString() : undefined,
  }
})

export const gitlabConfigFactory = registerAs('gitlab', () => gitlabFeatureSchema.parse(process.env))
