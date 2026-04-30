import { Module } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { ConfigurationModule } from '../infrastructure/configuration/configuration.module'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { VaultModule } from '../vault/vault.module'
import { NexusClientService } from './nexus-client.service'
import { NexusDatastoreService } from './nexus-datastore.service'
import { NexusHealthService } from './nexus-health.service'
import { NexusHttpClientService } from './nexus-http-client.service'
import { NexusService } from './nexus.service'

@Module({
  imports: [ConfigurationModule, InfrastructureModule, VaultModule],
  providers: [HealthIndicatorService, NexusHealthService, NexusService, NexusDatastoreService, NexusHttpClientService, NexusClientService],
  exports: [NexusClientService, NexusHealthService],
})
export class NexusModule {}
