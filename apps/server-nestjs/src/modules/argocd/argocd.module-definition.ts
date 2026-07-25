import { createConfigurableModule } from '../configurable-feature-module'

export interface ArgocdConfig {
  namespace: string
  url: string
  internalUrl: string
  extraRepositories: string
  dsoEnvChartVersion: string
  dsoNsChartVersion: string
  vaultDeployVaultConnectionInNs: boolean
  internalOrPublicUrl?: string
}

export interface ArgoCDModuleOptions extends ArgocdConfig {}

const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = createConfigurableModule<ArgoCDModuleOptions>('argocd')

export { ConfigurableModuleClass }
export { MODULE_OPTIONS_TOKEN as ARGOCD_CONFIG }
