import { registerAs } from '@nestjs/config'
import z from 'zod'
import { truthySchema, urlSchema } from './config.utils'

const nexusFeatureSchema = z.object({
  NEXUS_URL: urlSchema,
  NEXUS_INTERNAL_URL: urlSchema.optional(),
  NEXUS_ADMIN: z.string().min(1),
  NEXUS_ADMIN_PASSWORD: z.string().min(1),
  NEXUS__SECRET_EXPOSE_INTERNAL_URL: truthySchema.default('false').transform(v => v === 'true' || v === '1'),
}).transform(raw => ({
  url: raw.NEXUS_URL,
  internalUrl: raw.NEXUS_INTERNAL_URL,
  admin: raw.NEXUS_ADMIN,
  adminPassword: raw.NEXUS_ADMIN_PASSWORD,
  secretExposeInternalUrl: raw.NEXUS__SECRET_EXPOSE_INTERNAL_URL,
}))

export type NexusConfig = z.infer<typeof nexusFeatureSchema>

export const nexusConfigFactory = registerAs('nexus', () => nexusFeatureSchema.parse(process.env))
