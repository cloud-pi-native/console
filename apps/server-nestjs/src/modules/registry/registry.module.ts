import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TerminusModule } from '@nestjs/terminus'
import { baseConfigFactory } from '../../config/base.config'
import { harborConfigFactory } from '../../config/harbor.config'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { VaultModule } from '../vault/vault.module'
import { RegistryClientService } from './registry-client.service'
import { RegistryDatastoreService } from './registry-datastore.service'
import { RegistryHealthService } from './registry-health.service'
import { RegistryHttpClientService } from './registry-http-client.service'
import { RegistryPluginService } from './registry-plugin.service'
import { RegistryService } from './registry.service'

@Module({
  imports: [DatabaseModule, TerminusModule, VaultModule, CacheModule.register(), ConfigModule.forFeature(harborConfigFactory), ConfigModule.forFeature(baseConfigFactory)],
  providers: [RegistryHealthService, RegistryPluginService, RegistryService, RegistryDatastoreService, RegistryHttpClientService, RegistryClientService],
  exports: [RegistryHealthService, RegistryPluginService, RegistryService],
})
export class RegistryModule {}
