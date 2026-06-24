import { Module } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { ConfigurationModule } from '../infrastructure/configuration/configuration.module'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { VaultClientService } from './vault-client.service'
import { VaultDatastoreService } from './vault-datastore.service'
import { VaultHealthService } from './vault-health.service'
import { VaultHttpClientService } from './vault-http-client.service'
import { VaultPluginService } from './vault-plugin.service'
import { VaultService } from './vault.service'

@Module({
  imports: [ConfigurationModule, InfrastructureModule],
  providers: [
    HealthIndicatorService,
    VaultHealthService,
    VaultHttpClientService,
    VaultClientService,
    VaultPluginService,
    VaultService,
    VaultDatastoreService,
  ],
  exports: [VaultClientService, VaultHealthService, VaultPluginService, VaultService],
})
export class VaultModule {}
