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
  dbUrl?: string
  sessionSecret?: string
  contactEmail: string
  mockPlugins: boolean
  projectsRootDir?: string
  pluginsDir: string
  httpProxy?: string
  httpsProxy?: string
}

// Runtime config (BASE_CONFIG token) is owned by the global config/base.config.ts
// (which calls registerAs('base', ...)); re-exported here so services keep a single
// stable import surface (the module) while config depends on the module.
export { BASE_CONFIG } from './base.module'
