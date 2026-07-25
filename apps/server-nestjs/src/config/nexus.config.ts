import { registerAs } from '@nestjs/config'
import z from 'zod'
import { flag, nonEmpty, truthySchema } from './config.utils'

const nexusFeatureSchema = z.object({
  USE_NEXUS: flag(truthySchema.default('true')),
  NEXUS_URL: nonEmpty(z.string().url()),
  NEXUS_INTERNAL_URL: nonEmpty(z.string().url()),
  NEXUS_ADMIN: z.string().min(1, 'NEXUS_ADMIN is required'),
  NEXUS_ADMIN_PASSWORD: z.string().min(1, 'NEXUS_ADMIN_PASSWORD is required'),
  NEXUS__SECRET_EXPOSE_INTERNAL_URL: flag(truthySchema.default('false')),
}).transform((raw) => {
  const urlBase = raw.NEXUS_INTERNAL_URL || raw.NEXUS_URL || undefined
  return {
    enabled: raw.USE_NEXUS,
    url: raw.NEXUS_URL,
    internalUrl: raw.NEXUS_INTERNAL_URL,
    admin: raw.NEXUS_ADMIN,
    adminPassword: raw.NEXUS_ADMIN_PASSWORD,
    secretExposeInternalUrl: raw.NEXUS__SECRET_EXPOSE_INTERNAL_URL,
    internalOrPublicUrl: urlBase,
    probeUrl: urlBase ? new URL('/service/rest/v1/status', urlBase).toString() : undefined,
  }
})

export const nexusConfigFactory = registerAs('nexus', () => nexusFeatureSchema.parse(process.env))
