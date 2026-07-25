import { createConfigurableModule } from '../configurable-feature-module'

export interface SonarqubeConfig {
  url: string
  internalUrl: string
  apiToken: string
  internalOrPublicUrl?: string
  probeUrl?: string
}

export interface SonarqubeModuleOptions extends SonarqubeConfig {}

const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = createConfigurableModule<SonarqubeModuleOptions>('sonarqube')

export { ConfigurableModuleClass }
export { MODULE_OPTIONS_TOKEN as SONARQUBE_CONFIG }
