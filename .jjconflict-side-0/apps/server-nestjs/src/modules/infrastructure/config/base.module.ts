import type { BaseConfig } from './base.config'
import { Global, Module } from '@nestjs/common'
import { createConfigurableModule } from '../../configurable-feature-module'

export interface BaseModuleOptions extends BaseConfig {}

const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = createConfigurableModule<BaseModuleOptions>('base', true)

@Global()
@Module({})
export class BaseModule extends ConfigurableModuleClass {}

export const BASE_CONFIG = MODULE_OPTIONS_TOKEN
