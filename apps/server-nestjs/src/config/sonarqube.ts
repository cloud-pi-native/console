import { registerAs } from '@nestjs/config'
import z from 'zod'

const flagSchema = z
  .preprocess(val => (val === undefined ? 'false' : val), z.enum(['true', 'false', '']))
  .transform(val => val === 'true')
  .default(false)

const optionalUrl = (schema: z.ZodString) => schema.url().optional().or(z.literal('').transform(() => undefined))
const nonEmptyString = z.string().transform(value => value.trim() || undefined)

const sonarqubeFeatureSchema = z.object({
  USE_SONARQUBE: flagSchema.default(true),
  SONARQUBE_URL: optionalUrl(z.string()).optional(),
  SONARQUBE_INTERNAL_URL: optionalUrl(z.string()).optional(),
  SONAR_API_TOKEN: nonEmptyString,
})

export type SonarqubeRawConfig = z.infer<typeof sonarqubeFeatureSchema>

export interface SonarqubeConfig {
  useSonarqube: boolean
  sonarqubeUrl: string | undefined
  sonarqubeInternalUrl: string | undefined
  sonarApiToken: string | undefined
  internalOrPublicSonarqubeUrl: string | undefined
}

function toSonarqubeConfig(raw: SonarqubeRawConfig): SonarqubeConfig {
  return {
    useSonarqube: raw.USE_SONARQUBE,
    sonarqubeUrl: raw.SONARQUBE_URL,
    sonarqubeInternalUrl: raw.SONARQUBE_INTERNAL_URL,
    sonarApiToken: raw.SONAR_API_TOKEN,
    internalOrPublicSonarqubeUrl: raw.SONARQUBE_INTERNAL_URL || raw.SONARQUBE_URL || undefined,
  }
}

export const KEY = 'sonarqube' as const

export const sonarqubeConfigFactory = registerAs(KEY, () =>
  toSonarqubeConfig(sonarqubeFeatureSchema.parse({
    USE_SONARQUBE: process.env.USE_SONARQUBE,
    SONARQUBE_URL: process.env.SONARQUBE_URL,
    SONARQUBE_INTERNAL_URL: process.env.SONARQUBE_INTERNAL_URL,
    SONAR_API_TOKEN: process.env.SONAR_API_TOKEN,
  })))

export default sonarqubeConfigFactory
