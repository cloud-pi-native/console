import { registerAs } from '@nestjs/config'
import z from 'zod'
import { urlSchema } from './config.utils'

const sonarqubeFeatureSchema = z.object({
  SONARQUBE_URL: urlSchema,
  SONARQUBE_INTERNAL_URL: urlSchema.optional(),
  SONAR_API_TOKEN: z.string().min(1),
}).transform(raw => ({
  url: raw.SONARQUBE_URL,
  internalUrl: raw.SONARQUBE_INTERNAL_URL,
  apiToken: raw.SONAR_API_TOKEN,
}))

export type SonarqubeConfig = z.infer<typeof sonarqubeFeatureSchema>

export const sonarqubeConfigFactory = registerAs('sonarqube', () => sonarqubeFeatureSchema.parse(process.env))
