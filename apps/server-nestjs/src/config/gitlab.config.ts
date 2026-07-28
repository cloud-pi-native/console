import { registerAs } from '@nestjs/config'
import z from 'zod'
import { optionalUrl, optionalValue, truthySchema } from './config.utils'

const gitlabFeatureSchema = z.object({
  GITLAB_TOKEN: optionalValue,
  GITLAB_URL: optionalUrl,
  GITLAB_INTERNAL_URL: optionalUrl,
  GITLAB_MIRROR_TOKEN_EXPIRATION_DAYS: z.coerce.number().int().positive().default(180),
  GITLAB_MIRROR_TOKEN_ROTATION_THRESHOLD_DAYS: z.coerce.number().int().positive().default(90),
  GITLAB__SECRET_EXPOSE_INTERNAL_URL: truthySchema.default('false').transform(v => v === 'true' || v === '1'),
  PROJECTS_ROOT_DIR: z.string().optional(),
}).transform((raw) => {
  const urlBase = raw.GITLAB_INTERNAL_URL ?? raw.GITLAB_URL
  return {
    token: raw.GITLAB_TOKEN,
    url: raw.GITLAB_URL,
    internalUrl: raw.GITLAB_INTERNAL_URL,
    secretExposeInternalUrl: raw.GITLAB__SECRET_EXPOSE_INTERNAL_URL,
    mirrorTokenExpirationDays: raw.GITLAB_MIRROR_TOKEN_EXPIRATION_DAYS,
    mirrorTokenRotationThresholdDays: raw.GITLAB_MIRROR_TOKEN_ROTATION_THRESHOLD_DAYS,
    projectRootDir: raw.PROJECTS_ROOT_DIR,
    internalOrPublicUrl: urlBase,
    probeUrl: urlBase ? new URL('/-/health', urlBase).toString() : undefined,
  }
})

export type GitlabConfig = z.infer<typeof gitlabFeatureSchema>

export const gitlabConfigFactory = registerAs('gitlab', () => gitlabFeatureSchema.parse(process.env))
