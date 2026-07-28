import { registerAs } from '@nestjs/config'
import z from 'zod'
import { optionalUrl, optionalValue, truthySchema } from './config.utils'

const nexusFeatureSchema = z.object({
  NEXUS_URL: optionalUrl,
  NEXUS_INTERNAL_URL: optionalUrl,
  NEXUS_ADMIN: optionalValue,
  NEXUS_ADMIN_PASSWORD: optionalValue,
  NEXUS__SECRET_EXPOSE_INTERNAL_URL: truthySchema.default('false').transform(v => v === 'true' || v === '1'),
}).transform((raw) => {
  const urlBase = raw.NEXUS_INTERNAL_URL ?? raw.NEXUS_URL
  return {
    url: raw.NEXUS_URL,
    internalUrl: raw.NEXUS_INTERNAL_URL,
    admin: raw.NEXUS_ADMIN,
    adminPassword: raw.NEXUS_ADMIN_PASSWORD,
    secretExposeInternalUrl: raw.NEXUS__SECRET_EXPOSE_INTERNAL_URL,
    internalOrPublicUrl: urlBase,
    probeUrl: urlBase ? new URL('/service/rest/v1/status', urlBase).toString() : undefined,
  }
})

export type NexusConfig = z.infer<typeof nexusFeatureSchema>

export const nexusConfigFactory = registerAs('nexus', () => nexusFeatureSchema.parse(process.env))
