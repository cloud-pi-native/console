import { Inject } from '@nestjs/common'
import { registerAs } from '@nestjs/config'
import z from 'zod'

const flagSchema = z
  .preprocess(val => (val === undefined ? 'false' : val), z.enum(['true', 'false', '']))
  .transform(val => val === 'true')
  .default(false)

const optionalUrl = (schema: z.ZodString) => schema.url().optional().or(z.literal('').transform(() => undefined))
const nonEmptyString = z.string().transform(value => value.trim() || undefined)

const baseFeatureSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
  INTEGRATION: flagSchema.optional(),
  CI: flagSchema.optional(),
  DEV_SETUP: flagSchema.optional(),
  DOCKER: flagSchema.optional(),
  SERVER_HOST: z.string().default('localhost'),
  SERVER_PORT: z.string().transform(Number).default('0'),
  APP_VERSION: z.string().optional(),
  DB_URL: z.string().url().optional(),
  SESSION_SECRET: z.string().min(32).optional(),
  CONTACT_EMAIL: z.string().email().default('cloudpinative-relations@interieur.gouv.fr'),
  MOCK_PLUGINS: flagSchema.optional(),
  PROJECTS_ROOT_DIR: nonEmptyString.optional(),
  PLUGINS_DIR: z.string().default('/plugins'),
  HTTP_PROXY: optionalUrl(z.string()).optional(),
  HTTPS_PROXY: optionalUrl(z.string()).optional(),
})

export type BaseRawConfig = z.infer<typeof baseFeatureSchema>

export interface BaseConfig {
  nodeEnv: 'development' | 'production' | 'test'
  isTest: boolean
  isDev: boolean
  isCI: boolean
  isProd: boolean
  integration: boolean
  ci: boolean
  devSetup: boolean
  docker: boolean
  serverHost: string
  serverPort: number
  appVersion: string
  dbUrl: string | undefined
  sessionSecret: string | undefined
  contactEmail: string
  mockPlugins: boolean
  projectsRootDir: string | undefined
  pluginsDir: string
  httpProxy: string | undefined
  httpsProxy: string | undefined
}

function toBaseConfig(raw: BaseRawConfig): BaseConfig {
  return {
    nodeEnv: raw.NODE_ENV === 'test' ? 'test' : raw.NODE_ENV === 'development' ? 'development' : 'production',
    isTest: raw.NODE_ENV === 'test',
    isDev: raw.NODE_ENV === 'development',
    isCI: raw.CI ?? false,
    isProd: raw.NODE_ENV === 'production',
    integration: raw.INTEGRATION ?? false,
    ci: raw.CI ?? false,
    devSetup: raw.DEV_SETUP ?? false,
    docker: raw.DOCKER ?? false,
    serverHost: raw.SERVER_HOST,
    serverPort: raw.SERVER_PORT,
    appVersion: raw.NODE_ENV === 'production' ? (raw.APP_VERSION ?? 'unknown') : 'dev',
    dbUrl: raw.DB_URL,
    sessionSecret: raw.SESSION_SECRET,
    contactEmail: raw.CONTACT_EMAIL,
    mockPlugins: raw.MOCK_PLUGINS ?? false,
    projectsRootDir: raw.PROJECTS_ROOT_DIR,
    pluginsDir: raw.PLUGINS_DIR,
    httpProxy: raw.HTTP_PROXY,
    httpsProxy: raw.HTTPS_PROXY,
  }
}

export const KEY = 'base' as const

export const baseConfigFactory = registerAs(KEY, () =>
  toBaseConfig(baseFeatureSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    INTEGRATION: process.env.INTEGRATION,
    CI: process.env.CI,
    DEV_SETUP: process.env.DEV_SETUP,
    DOCKER: process.env.DOCKER,
    SERVER_HOST: process.env.SERVER_HOST,
    SERVER_PORT: process.env.SERVER_PORT,
    APP_VERSION: process.env.APP_VERSION,
    DB_URL: process.env.DB_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
    CONTACT_EMAIL: process.env.CONTACT_EMAIL,
    MOCK_PLUGINS: process.env.MOCK_PLUGINS,
    PROJECTS_ROOT_DIR: process.env.PROJECTS_ROOT_DIR,
    PLUGINS_DIR: process.env.PLUGINS_DIR,
    HTTP_PROXY: process.env.HTTP_PROXY,
    HTTPS_PROXY: process.env.HTTPS_PROXY,
  })))

export const InjectBaseConfig = () => Inject(baseConfigFactory.KEY)

export default baseConfigFactory
