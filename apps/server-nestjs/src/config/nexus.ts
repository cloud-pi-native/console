import { registerAs } from '@nestjs/config'
import z from 'zod'

const flagSchema = z
  .preprocess(val => (val === undefined ? 'false' : val), z.enum(['true', 'false', '']))
  .transform(val => val === 'true')
  .default(false)

const optionalUrl = (schema: z.ZodString) => schema.url().optional().or(z.literal('').transform(() => undefined))

const nexusFeatureSchema = z.object({
  USE_NEXUS: flagSchema.default(true),
  NEXUS_URL: optionalUrl(z.string()).optional(),
  NEXUS_INTERNAL_URL: optionalUrl(z.string()).optional(),
  NEXUS_ADMIN: z.string().min(1, 'NEXUS_ADMIN is required'),
  NEXUS_ADMIN_PASSWORD: z.string().min(1, 'NEXUS_ADMIN_PASSWORD is required'),
  NEXUS__SECRET_EXPOSE_INTERNAL_URL: flagSchema.default(false),
})

export type NexusRawConfig = z.infer<typeof nexusFeatureSchema>

export interface NexusConfig {
  useNexus: boolean
  nexusUrl: string | undefined
  nexusInternalUrl: string | undefined
  nexusAdmin: string
  nexusAdminPassword: string
  secretExposeInternalUrl: boolean
  internalOrPublicNexusUrl: string | undefined
}

function toNexusConfig(raw: NexusRawConfig): NexusConfig {
  return {
    useNexus: raw.USE_NEXUS,
    nexusUrl: raw.NEXUS_URL,
    nexusInternalUrl: raw.NEXUS_INTERNAL_URL,
    nexusAdmin: raw.NEXUS_ADMIN,
    nexusAdminPassword: raw.NEXUS_ADMIN_PASSWORD,
    secretExposeInternalUrl: raw.NEXUS__SECRET_EXPOSE_INTERNAL_URL,
    internalOrPublicNexusUrl: raw.NEXUS_INTERNAL_URL || raw.NEXUS_URL || undefined,
  }
}

export const KEY = 'nexus' as const

export const nexusConfigFactory = registerAs(KEY, () =>
  toNexusConfig(nexusFeatureSchema.parse({
    USE_NEXUS: process.env.USE_NEXUS,
    NEXUS_URL: process.env.NEXUS_URL,
    NEXUS_INTERNAL_URL: process.env.NEXUS_INTERNAL_URL,
    NEXUS_ADMIN: process.env.NEXUS_ADMIN,
    NEXUS_ADMIN_PASSWORD: process.env.NEXUS_ADMIN_PASSWORD,
    NEXUS__SECRET_EXPOSE_INTERNAL_URL: process.env.NEXUS__SECRET_EXPOSE_INTERNAL_URL,
  })))

export default nexusConfigFactory
