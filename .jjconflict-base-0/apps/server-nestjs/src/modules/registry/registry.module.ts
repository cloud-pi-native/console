import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { VaultModule } from '../vault/vault.module'
import { ConfigurableModuleClass as HarborConfigurableModuleClass } from './harbor.module-definition'
import { RegistryClientService } from './registry-client.service'
import { RegistryDatastoreService } from './registry-datastore.service'
import { RegistryHealthService } from './registry-health.service'
import { RegistryHttpClientService } from './registry-http-client.service'
import { RegistryPluginService } from './registry-plugin.service'
import { ConfigurableModuleClass } from './registry.module-definition'
import { RegistryService } from './registry.service'

@Module({})
export class HarborModule extends HarborConfigurableModuleClass {}

@Module({
  imports: [DatabaseModule, TerminusModule, VaultModule, HarborModule, CacheModule.register()],
  providers: [RegistryHealthService, RegistryPluginService, RegistryService, RegistryDatastoreService, RegistryHttpClientService, RegistryClientService],
  exports: [RegistryHealthService, RegistryPluginService, RegistryService],
})
export class RegistryModule extends ConfigurableModuleClass {}
