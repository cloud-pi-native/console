import { registerAs } from '@nestjs/config'
import z from 'zod'
import { truthySchema, urlSchema } from './config.utils'

const gitlabFeatureSchema = z.object({
  GITLAB_TOKEN: z.string().min(1),
  GITLAB_URL: urlSchema,
  GITLAB_INTERNAL_URL: urlSchema.optional(),
  GITLAB_MIRROR_TOKEN_EXPIRATION_DAYS: z.coerce.number().int().positive().default(365),
  GITLAB__SECRET_EXPOSE_INTERNAL_URL: truthySchema.default('false').transform(v => v === 'true' || v === '1'),
  PROJECTS_ROOT_DIR: z.string().min(1),
}).transform(raw => ({
  token: raw.GITLAB_TOKEN,
  url: raw.GITLAB_URL,
  internalUrl: raw.GITLAB_INTERNAL_URL,
  secretExposeInternalUrl: raw.GITLAB__SECRET_EXPOSE_INTERNAL_URL,
  mirrorTokenExpirationDays: raw.GITLAB_MIRROR_TOKEN_EXPIRATION_DAYS,
  projectRootDir: raw.PROJECTS_ROOT_DIR,
}))

export type GitlabConfig = z.infer<typeof gitlabFeatureSchema>

export const gitlabConfigFactory = registerAs('gitlab', () => gitlabFeatureSchema.parse(process.env))
