import { registerAs } from '@nestjs/config'
import z from 'zod'
import { optionalUrl, optionalValue } from './config.utils'

const sonarqubeFeatureSchema = z.object({
  SONARQUBE_URL: optionalUrl,
  SONARQUBE_INTERNAL_URL: optionalUrl,
  SONAR_API_TOKEN: optionalValue,
}).transform((raw) => {
  const urlBase = raw.SONARQUBE_INTERNAL_URL ?? raw.SONARQUBE_URL
  return {
    url: raw.SONARQUBE_URL,
    internalUrl: raw.SONARQUBE_INTERNAL_URL,
    apiToken: raw.SONAR_API_TOKEN,
    internalOrPublicUrl: urlBase,
    probeUrl: urlBase ? new URL('/api/system/health', urlBase).toString() : undefined,
  }
})

export type SonarqubeConfig = z.infer<typeof sonarqubeFeatureSchema>

export const sonarqubeConfigFactory = registerAs('sonarqube', () => sonarqubeFeatureSchema.parse(process.env))
