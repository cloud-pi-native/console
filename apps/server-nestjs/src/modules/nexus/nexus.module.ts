import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TerminusModule } from '@nestjs/terminus'
import nexusConfigFactory from '../../config/nexus'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { VaultModule } from '../vault/vault.module'
import { NexusClientService } from './nexus-client.service'
import { NexusDatastoreService } from './nexus-datastore.service'
import { NexusHealthService } from './nexus-health.service'
import { NexusHttpClientService } from './nexus-http-client.service'
import { NexusPluginService } from './nexus-plugin.service'
import { NexusService } from './nexus.service'

@Module({
  imports: [DatabaseModule, TerminusModule, VaultModule, ConfigModule.forFeature([nexusConfigFactory])],
  providers: [
    NexusHealthService,
    NexusPluginService,
    NexusService,
    NexusDatastoreService,
    NexusHttpClientService,
    NexusClientService,
  ],
  exports: [NexusClientService, NexusHealthService, NexusPluginService, NexusService],
})
export class NexusModule {}
