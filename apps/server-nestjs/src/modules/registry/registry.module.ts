import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
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
  imports: [ConfigurationModule, InfrastructureModule, VaultModule, CacheModule.register()],
  providers: [HealthIndicatorService, RegistryHealthService, RegistryPluginService, RegistryService, RegistryDatastoreService, RegistryHttpClientService, RegistryClientService],
  exports: [RegistryHealthService, RegistryPluginService, RegistryService],
})
export class RegistryModule {}
