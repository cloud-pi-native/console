import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { ConfigurationModule } from '../infrastructure/configuration/configuration.module'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { VaultModule } from '../vault/vault.module'
import { RegistryClientService } from './registry-client.service'
import { RegistryDatastoreService } from './registry-datastore.service'
import { RegistryHealthService } from './registry-health.service'
import { RegistryHttpClientService } from './registry-http-client.service'
import { RegistryPluginService } from './registry-plugin.service'
import { RegistryService } from './registry.service'

@Module({
  imports: [ConfigurationModule, InfrastructureModule, TerminusModule, VaultModule, CacheModule.register()],
  providers: [RegistryHealthService, RegistryPluginService, RegistryService, RegistryDatastoreService, RegistryHttpClientService, RegistryClientService],
  exports: [RegistryHealthService, RegistryPluginService, RegistryService],
})
export class RegistryModule {}
