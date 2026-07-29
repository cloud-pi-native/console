import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { ConfigurationModule } from '../infrastructure/configuration/configuration.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { VaultModule } from '../vault/vault.module'
import { RegistryClientService } from './registry-client.service'
import { RegistryDatastoreService } from './registry-datastore.service'
import { RegistryHealthService } from './registry-health.service'
import { RegistryHttpClientService } from './registry-http-client.service'
import { RegistryPluginService } from './registry-plugin.service'
import { RegistryService } from './registry.service'

@Module({
  imports: [CacheModule.register(), ConfigurationModule, DatabaseModule, TerminusModule, VaultModule],
  providers: [RegistryClientService, RegistryDatastoreService, RegistryHealthService, RegistryHttpClientService, RegistryPluginService, RegistryService],
  exports: [RegistryHealthService, RegistryPluginService, RegistryService],
})
export class RegistryModule {}
