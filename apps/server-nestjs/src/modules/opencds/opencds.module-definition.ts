import { createConfigurableModule } from '../configurable-feature-module'

export interface OpenCdsConfig {
  url: string
  internalUrl: string
  probeUrl?: string
  apiToken: string
  apiTlsRejectUnauthorized: boolean
}

export interface OpenCdsModuleOptions extends OpenCdsConfig {}

const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = createConfigurableModule<OpenCdsModuleOptions>('opencds')

export { ConfigurableModuleClass }
export { MODULE_OPTIONS_TOKEN as OPENCDS_CONFIG }
