import { registerAs } from '@nestjs/config'
import z from 'zod'
import { truthySchema } from './config.utils'

const nexusFeatureSchema = z.object({
  NEXUS_URL: z.string().url(),
  NEXUS_INTERNAL_URL: z.string().url().optional(),
  NEXUS_ADMIN: z.string().min(1),
  NEXUS_ADMIN_PASSWORD: z.string().min(1),
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
    probeUrl: new URL('/service/rest/v1/status', urlBase).toString(),
  }
})

export type NexusConfig = z.infer<typeof nexusFeatureSchema>

export const nexusConfigFactory = registerAs('nexus', () => nexusFeatureSchema.parse(process.env))
