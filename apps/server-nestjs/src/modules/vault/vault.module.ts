import { Module } from '@nestjs/common'
import { ConfigurationModule } from '../../cpin-module/infrastructure/configuration/configuration.module'
import { InfrastructureModule } from '../../cpin-module/infrastructure/infrastructure.module'
import { VaultClientService } from './vault-client.service'
import { VaultControllerService } from './vault-controller.service'
import { VaultDatastoreService } from './vault-datastore.service'
import { VaultHealthService } from './vault-health.service'

@Module({
  imports: [ConfigurationModule, InfrastructureModule],
  providers: [
    VaultClientService,
    VaultControllerService,
    VaultDatastoreService,
    VaultHealthService,
  ],
  exports: [VaultClientService, VaultHealthService],
})
export class VaultModule {}
