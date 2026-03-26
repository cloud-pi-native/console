import { Module } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { ConfigurationModule } from '../../cpin-module/infrastructure/configuration/configuration.module'
import { InfrastructureModule } from '../../cpin-module/infrastructure/infrastructure.module'
import { VaultModule } from '../vault/vault.module'
import { RegistryClientService } from './registry-client.service'
import { RegistryDatastoreService } from './registry-datastore.service'
import { RegistryHealthService } from './registry-health.service'
import { RegistryService } from './registry.service'

@Module({
  imports: [ConfigurationModule, InfrastructureModule, VaultModule],
  providers: [HealthIndicatorService, RegistryHealthService, RegistryService, RegistryDatastoreService, RegistryClientService],
  exports: [RegistryHealthService, RegistryService],
})
export class RegistryModule {}
