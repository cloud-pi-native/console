import { registerAs } from '@nestjs/config'
import z from 'zod'
import { truthySchema } from './config.utils'

const serviceChainFeatureSchema = z.object({
  OPENCDS_URL: z.string().url(),
  OPENCDS_INTERNAL_URL: z.string().url().optional(),
  OPENCDS_API_TOKEN: z.string().min(1),
  OPENCDS_API_TLS_REJECT_UNAUTHORIZED: truthySchema.default('true').transform(v => v === 'true' || v === '1'),
}).transform((raw) => {
  return {
    url: raw.OPENCDS_URL,
    internalUrl: raw.OPENCDS_INTERNAL_URL,
    apiToken: raw.OPENCDS_API_TOKEN,
    apiTlsRejectUnauthorized: raw.OPENCDS_API_TLS_REJECT_UNAUTHORIZED,
  }
})

export type ServiceChainConfig = z.infer<typeof serviceChainFeatureSchema>

export const serviceChainConfigFactory = registerAs('serviceChain', () => serviceChainFeatureSchema.parse(process.env))
