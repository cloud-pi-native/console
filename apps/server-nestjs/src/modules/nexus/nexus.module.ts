import { Module } from '@nestjs/common'
import { ConfigurationModule } from '../../cpin-module/infrastructure/configuration/configuration.module'
import { InfrastructureModule } from '../../cpin-module/infrastructure/infrastructure.module'
import { VaultModule } from '../vault/vault.module'
import { NexusClientService } from './nexus-client.service'
import { NexusControllerService } from './nexus-controller.service'
import { NexusDatastoreService } from './nexus-datastore.service'
import { NexusHealthService } from './nexus-health.service'

@Module({
  imports: [ConfigurationModule, InfrastructureModule, VaultModule],
  providers: [NexusControllerService, NexusDatastoreService, NexusClientService],
  exports: [NexusClientService, NexusHealthService],
})
export class NexusModule {}
