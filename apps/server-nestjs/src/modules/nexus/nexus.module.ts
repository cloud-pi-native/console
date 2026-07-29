import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { ConfigurationModule } from '../infrastructure/configuration/configuration.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { VaultModule } from '../vault/vault.module'
import { NexusClientService } from './nexus-client.service'
import { NexusDatastoreService } from './nexus-datastore.service'
import { NexusHealthService } from './nexus-health.service'
import { NexusHttpClientService } from './nexus-http-client.service'
import { NexusPluginService } from './nexus-plugin.service'
import { NexusService } from './nexus.service'

@Module({
  imports: [ConfigurationModule, DatabaseModule, TerminusModule, VaultModule],
  providers: [
    NexusClientService,
    NexusDatastoreService,
    NexusHealthService,
    NexusHttpClientService,
    NexusPluginService,
    NexusService,
  ],
  exports: [NexusClientService, NexusHealthService, NexusPluginService, NexusService],
})
export class NexusModule {}
