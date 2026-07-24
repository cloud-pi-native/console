import { registerAs } from '@nestjs/config'
import z from 'zod'

const flagSchema = z
  .preprocess(val => (val === undefined ? 'false' : val), z.enum(['true', 'false', '']))
  .transform(val => val === 'true')
  .default(false)

const optionalUrl = (schema: z.ZodString) => schema.url().optional().or(z.literal('').transform(() => undefined))
const nonEmptyString = z.string().transform(value => value.trim() || undefined)

const opencdsFeatureSchema = z.object({
  USE_OPENCDS: flagSchema.default(true),
  OPENCDS_URL: optionalUrl(z.string()).optional(),
  OPENCDS_API_TOKEN: nonEmptyString,
  OPENCDS_API_TLS_REJECT_UNAUTHORIZED: flagSchema.default(false),
})

export type OpenCdsRawConfig = z.infer<typeof opencdsFeatureSchema>

export interface OpenCdsConfig {
  useOpenCds: boolean
  openCdsUrl: string | undefined
  openCdsApiToken: string | undefined
  openCdsApiTlsRejectUnauthorized: boolean
}

function toOpenCdsConfig(raw: OpenCdsRawConfig): OpenCdsConfig {
  return {
    useOpenCds: raw.USE_OPENCDS,
    openCdsUrl: raw.OPENCDS_URL,
    openCdsApiToken: raw.OPENCDS_API_TOKEN,
    openCdsApiTlsRejectUnauthorized: raw.OPENCDS_API_TLS_REJECT_UNAUTHORIZED,
  }
}

export const KEY = 'opencds' as const

export const openCdsConfigFactory = registerAs(KEY, () =>
  toOpenCdsConfig(opencdsFeatureSchema.parse({
    USE_OPENCDS: process.env.USE_OPENCDS,
    OPENCDS_URL: process.env.OPENCDS_URL,
    OPENCDS_API_TOKEN: process.env.OPENCDS_API_TOKEN,
    OPENCDS_API_TLS_REJECT_UNAUTHORIZED: process.env.OPENCDS_API_TLS_REJECT_UNAUTHORIZED,
  })))

export default openCdsConfigFactory
