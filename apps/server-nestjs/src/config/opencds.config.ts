import { registerAs } from '@nestjs/config'
import z from 'zod'
import { flag, nonEmpty, truthySchema } from './config.utils'

const opencdsFeatureSchema = z.object({
  USE_OPENCDS: flag(truthySchema.default('true')),
  OPENCDS_URL: nonEmpty(z.string().url()),
  OPENCDS_INTERNAL_URL: nonEmpty(z.string().url()),
  OPENCDS_API_TOKEN: nonEmpty(z.string()),
  OPENCDS_API_TLS_REJECT_UNAUTHORIZED: flag(truthySchema.default('false')),
}).transform((raw) => {
  const probeBase = raw.OPENCDS_INTERNAL_URL || raw.OPENCDS_URL
  return {
    enabled: raw.USE_OPENCDS,
    url: raw.OPENCDS_URL,
    internalUrl: raw.OPENCDS_INTERNAL_URL,
    probeUrl: probeBase ? new URL('/api/v1/health', probeBase).toString() : undefined,
    apiToken: raw.OPENCDS_API_TOKEN,
    apiTlsRejectUnauthorized: raw.OPENCDS_API_TLS_REJECT_UNAUTHORIZED,
  }
})

export type OpenCdsConfig = z.infer<typeof opencdsFeatureSchema>

export const opencdsConfigFactory = registerAs('opencds', () => opencdsFeatureSchema.parse(process.env))
