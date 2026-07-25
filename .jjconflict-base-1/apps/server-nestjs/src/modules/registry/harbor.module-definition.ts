import { createConfigurableModule } from '../configurable-feature-module'

export interface HarborConfig {
  url: string
  internalUrl: string
  admin: string
  adminPassword: string
  ruleTemplate?: string
  ruleCount?: string
  retentionCron: string
  robotRotationThresholdDays: number
  projectSlugCacheTtlMs: number
  internalOrPublicUrl?: string
  probeUrl?: string
}

export interface HarborModuleOptions extends HarborConfig {}

const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = createConfigurableModule<HarborModuleOptions>('harbor')

export { ConfigurableModuleClass }
export { MODULE_OPTIONS_TOKEN as HARBOR_CONFIG }
