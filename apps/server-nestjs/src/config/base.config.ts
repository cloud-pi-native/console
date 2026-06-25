import { registerAs } from '@nestjs/config'
import z from 'zod'
import { flag, nonEmpty, truthySchema } from './config.utils'

const baseFeatureSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
  INTEGRATION: flag(truthySchema.default('false')),
  CI: flag(truthySchema.default('false')),
  DEV_SETUP: flag(truthySchema.default('false')),
  DOCKER: flag(truthySchema.default('false')),
  SERVER_HOST: z.string().default('localhost'),
  SERVER_PORT: z.string().transform(Number).default('0'),
  APP_VERSION: z.string().optional().default('unknown'),
  DB_URL: z.string().url().optional(),
  SESSION_SECRET: z.string().min(32).optional(),
  CONTACT_EMAIL: z.string().email().default('cloudpinative-relations@interieur.gouv.fr'),
  MOCK_PLUGINS: flag(truthySchema.default('false')),
  PROJECTS_ROOT_DIR: nonEmpty(z.string()),
  PLUGINS_DIR: z.string().default('/plugins'),
  HTTP_PROXY: nonEmpty(z.string().url()),
  HTTPS_PROXY: nonEmpty(z.string().url()),
}).transform((raw) => {
  const nodeEnv = raw.NODE_ENV ?? 'production'
  return {
    nodeEnv,
    isTest: raw.NODE_ENV === 'test',
    isDev: raw.NODE_ENV === 'development',
    isCI: raw.CI,
    isProd: nodeEnv === 'production',
    integration: raw.INTEGRATION,
    ci: raw.CI,
    devSetup: raw.DEV_SETUP,
    docker: raw.DOCKER,
    serverHost: raw.SERVER_HOST,
    serverPort: raw.SERVER_PORT,
    appVersion: raw.NODE_ENV === 'production' ? raw.APP_VERSION : 'dev',
    dbUrl: raw.DB_URL,
    sessionSecret: raw.SESSION_SECRET,
    contactEmail: raw.CONTACT_EMAIL,
    mockPlugins: raw.MOCK_PLUGINS,
    projectsRootDir: raw.PROJECTS_ROOT_DIR,
    pluginsDir: raw.PLUGINS_DIR,
    httpProxy: raw.HTTP_PROXY,
    httpsProxy: raw.HTTPS_PROXY,
  }
})

export type BaseConfig = z.infer<typeof baseFeatureSchema>

export const baseConfigFactory = registerAs('base', () => baseFeatureSchema.parse(process.env))
