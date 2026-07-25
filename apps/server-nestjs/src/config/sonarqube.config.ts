import { registerAs } from '@nestjs/config'
import z from 'zod'
import { flag, nonEmpty, truthySchema } from './config.utils'

const sonarqubeFeatureSchema = z.object({
  USE_SONARQUBE: flag(truthySchema.default('true')),
  SONARQUBE_URL: nonEmpty(z.string().url()),
  SONARQUBE_INTERNAL_URL: nonEmpty(z.string().url()),
  SONAR_API_TOKEN: nonEmpty(z.string()),
}).transform((raw) => {
  const urlBase = raw.SONARQUBE_INTERNAL_URL || raw.SONARQUBE_URL || undefined
  return {
    enabled: raw.USE_SONARQUBE,
    url: raw.SONARQUBE_URL,
    internalUrl: raw.SONARQUBE_INTERNAL_URL,
    apiToken: raw.SONAR_API_TOKEN,
    internalOrPublicUrl: urlBase,
    probeUrl: urlBase ? new URL('/api/system/health', urlBase).toString() : undefined,
  }
})

export const sonarqubeConfigFactory = registerAs('sonarqube', () => sonarqubeFeatureSchema.parse(process.env))
