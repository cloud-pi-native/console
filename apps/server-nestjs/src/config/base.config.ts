import { registerAs } from '@nestjs/config'
import z from 'zod'
import { flag, truthySchema, urlSchema } from './config.utils'

const baseFeatureSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  CI: flag(truthySchema.default('false')),
  SERVER_HOST: z.string().default('localhost'),
  SERVER_PORT: z.string().transform(Number).default('0'),
  APP_VERSION: z.string().default('unknown'),
  DB_URL: urlSchema,
  PROJECTS_ROOT_DIR: z.string().default(''),
}).transform((raw) => {
  return {
    isTest: raw.NODE_ENV === 'test',
    isDev: raw.NODE_ENV === 'development',
    isCI: raw.CI,
    isProd: raw.NODE_ENV === 'production',
    serverHost: raw.SERVER_HOST,
    serverPort: raw.SERVER_PORT,
    appVersion: raw.NODE_ENV === 'production' ? raw.APP_VERSION : 'dev',
    dbUrl: raw.DB_URL,
    projectsRootDir: raw.PROJECTS_ROOT_DIR,
  }
})

export type BaseConfig = z.infer<typeof baseFeatureSchema>

export const baseConfigFactory = registerAs('base', () => baseFeatureSchema.parse(process.env))
