import { createConfigurableModule } from '../configurable-feature-module'

export interface RegistryConfig {
  url: string
  internalUrl: string
  admin: string
  adminPassword: string
  ruleTemplate: string
  ruleCount?: number
  retentionCron: string
  robotRotationThresholdDays: number
  projectSlugCacheTtlMs: number
  internalOrPublicUrl?: string
}

export interface RegistryModuleOptions extends RegistryConfig {}

const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = createConfigurableModule<RegistryModuleOptions>('registry')

export { ConfigurableModuleClass }
export { MODULE_OPTIONS_TOKEN as REGISTRY_CONFIG }
