import { createConfigurableModule } from '../configurable-feature-module'

export interface NexusConfig {
  url: string
  internalUrl: string
  admin: string
  adminPassword: string
  secretExposeInternalUrl: boolean
  internalOrPublicUrl?: string
  probeUrl?: string
}

export interface NexusModuleOptions extends NexusConfig {}

const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = createConfigurableModule<NexusModuleOptions>('nexus')

export { ConfigurableModuleClass }
export { MODULE_OPTIONS_TOKEN as NEXUS_CONFIG }
