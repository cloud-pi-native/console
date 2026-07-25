import { registerAs } from '@nestjs/config'
import z from 'zod'

const sonarqubeFeatureSchema = z.object({
  SONARQUBE_URL: z.string().url(),
  SONARQUBE_INTERNAL_URL: z.string().url().optional(),
  SONAR_API_TOKEN: z.string().min(1),
}).transform((raw) => {
  const urlBase = raw.SONARQUBE_INTERNAL_URL ?? raw.SONARQUBE_URL
  return {
    url: raw.SONARQUBE_URL,
    internalUrl: raw.SONARQUBE_INTERNAL_URL,
    apiToken: raw.SONAR_API_TOKEN,
    internalOrPublicUrl: urlBase,
    probeUrl: new URL('/api/system/health', urlBase).toString(),
  }
})

export const sonarqubeConfigFactory = registerAs('sonarqube', () => sonarqubeFeatureSchema.parse(process.env))
