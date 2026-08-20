import { registerAs } from '@nestjs/config'
import z from 'zod'
import { truthySchema } from './config.utils'

// new URL() normalizes case/dot-segments but keeps a root trailing slash;
// gitbeaker joins host + "api/v4" with "/", so that slash yields "//api/v4".
// Strip trailing slashes linearly (no regex) to avoid any backtracking cost.
const normalizeUrl = (s: string) => {
  const href = new URL(s).href
  let end = href.length
  while (end > 0 && href[end - 1] === '/') end--
  return href.slice(0, end)
}

const gitlabFeatureSchema = z.object({
  GITLAB_TOKEN: z.string().min(1),
  GITLAB_URL: z.string().url().transform(normalizeUrl),
  GITLAB_INTERNAL_URL: z.string().url().transform(normalizeUrl).optional(),
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
