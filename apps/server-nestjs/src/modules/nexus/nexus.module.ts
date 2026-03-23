import { Module } from '@nestjs/common'
import { ConfigurationModule } from '../../cpin-module/infrastructure/configuration/configuration.module'
import { InfrastructureModule } from '../../cpin-module/infrastructure/infrastructure.module'
import { VaultModule } from '../vault/vault.module'
import { NexusClientService } from './nexus-client.service'
import { NexusDatastoreService } from './nexus-datastore.service'
import { NexusHealthService } from './nexus-health.service'
import { NexusService } from './nexus.service'

@Module({
  imports: [ConfigurationModule, InfrastructureModule, VaultModule],
  providers: [NexusService, NexusDatastoreService, NexusClientService],
  exports: [NexusClientService, NexusHealthService],
})
export class NexusModule {}
