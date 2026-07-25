import { createConfigurableModule } from '../configurable-feature-module'

export interface VaultConfig {
  token?: string
  url: string
  internalUrl: string
  kvName: string
  internalOrPublicUrl?: string
  probeUrl?: string
}

export interface VaultModuleOptions extends VaultConfig {}

const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = createConfigurableModule<VaultModuleOptions>('vault')

export { ConfigurableModuleClass }
export { MODULE_OPTIONS_TOKEN as VAULT_CONFIG }
