import { createConfigurableModule } from '../configurable-feature-module'

export interface GitlabConfig {
  token?: string
  url: string
  internalUrl: string
  mirrorTokenExpirationDays: number
  mirrorTokenRotationThresholdDays: number
  projectRootDir: string
  internalOrPublicUrl?: string
  probeUrl?: string
}

export interface GitlabModuleOptions extends GitlabConfig {}

const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = createConfigurableModule<GitlabModuleOptions>('gitlab')

export { ConfigurableModuleClass }
export { MODULE_OPTIONS_TOKEN as GITLAB_CONFIG }
