import { registerAs } from '@nestjs/config'
import z from 'zod'
import { flag, truthySchema } from './config.utils'

const baseFeatureSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
  CI: flag(truthySchema.default('false')),
  SERVER_HOST: z.string().default('localhost'),
  SERVER_PORT: z.string().transform(Number).default('0'),
  APP_VERSION: z.string().optional().default('unknown'),
  DB_URL: z.string().url().optional(),
  PROJECTS_ROOT_DIR: z.string().min(1, 'PROJECTS_ROOT_DIR is required'),
  HTTP_PROXY: z.string().url().optional(),
}).transform((raw) => {
  const nodeEnv = raw.NODE_ENV ?? 'production'
  return {
    isTest: raw.NODE_ENV === 'test',
    isDev: raw.NODE_ENV === 'development',
    isCI: raw.CI,
    isProd: nodeEnv === 'production',
    serverHost: raw.SERVER_HOST,
    serverPort: raw.SERVER_PORT,
    appVersion: raw.NODE_ENV === 'production' ? raw.APP_VERSION : 'dev',
    dbUrl: raw.DB_URL,
    projectsRootDir: raw.PROJECTS_ROOT_DIR,
    httpProxy: raw.HTTP_PROXY,
  }
})

export type BaseConfig = z.infer<typeof baseFeatureSchema>

export const baseConfigFactory = registerAs('base', () => baseFeatureSchema.parse(process.env))
