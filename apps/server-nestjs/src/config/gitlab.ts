import { registerAs } from '@nestjs/config'
import z from 'zod'

const flagSchema = z
  .preprocess(val => (val === undefined ? 'false' : val), z.enum(['true', 'false', '']))
  .transform(val => val === 'true')
  .default(false)

const optionalUrl = (schema: z.ZodString) => schema.url().optional().or(z.literal('').transform(() => undefined))

const gitlabFeatureSchema = z.object({
  USE_GITLAB: flagSchema.default(true),
  GITLAB_TOKEN: z.string().min(1, 'GITLAB_TOKEN is required'),
  GITLAB_URL: optionalUrl(z.string()).optional(),
  GITLAB_INTERNAL_URL: optionalUrl(z.string()).optional(),
  GITLAB_MIRROR_TOKEN_EXPIRATION_DAYS: z.coerce.number().int().positive().default(180),
  GITLAB_MIRROR_TOKEN_ROTATION_THRESHOLD_DAYS: z.coerce.number().int().positive().default(90),
})

export type GitlabRawConfig = z.infer<typeof gitlabFeatureSchema>

export interface GitlabConfig {
  useGitlab: boolean
  gitlabToken: string
  gitlabUrl: string | undefined
  gitlabInternalUrl: string | undefined
  gitlabMirrorTokenExpirationDays: number
  gitlabMirrorTokenRotationThresholdDays: number
  internalOrPublicGitlabUrl: string | undefined
}

function toGitlabConfig(raw: GitlabRawConfig): GitlabConfig {
  return {
    useGitlab: raw.USE_GITLAB,
    gitlabToken: raw.GITLAB_TOKEN,
    gitlabUrl: raw.GITLAB_URL,
    gitlabInternalUrl: raw.GITLAB_INTERNAL_URL,
    gitlabMirrorTokenExpirationDays: raw.GITLAB_MIRROR_TOKEN_EXPIRATION_DAYS,
    gitlabMirrorTokenRotationThresholdDays: raw.GITLAB_MIRROR_TOKEN_ROTATION_THRESHOLD_DAYS,
    internalOrPublicGitlabUrl: raw.GITLAB_INTERNAL_URL || raw.GITLAB_URL || undefined,
  }
}

export const KEY = 'gitlab' as const

export const gitlabConfigFactory = registerAs(KEY, () =>
  toGitlabConfig(gitlabFeatureSchema.parse({
    USE_GITLAB: process.env.USE_GITLAB,
    GITLAB_TOKEN: process.env.GITLAB_TOKEN,
    GITLAB_URL: process.env.GITLAB_URL,
    GITLAB_INTERNAL_URL: process.env.GITLAB_INTERNAL_URL,
    GITLAB_MIRROR_TOKEN_EXPIRATION_DAYS: process.env.GITLAB_MIRROR_TOKEN_EXPIRATION_DAYS,
    GITLAB_MIRROR_TOKEN_ROTATION_THRESHOLD_DAYS: process.env.GITLAB_MIRROR_TOKEN_ROTATION_THRESHOLD_DAYS,
  })))

export default gitlabConfigFactory
