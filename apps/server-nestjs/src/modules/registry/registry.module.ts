import { Module } from '@nestjs/common'
import { ConfigurationModule } from '@/cpin-module/infrastructure/configuration/configuration.module'
import { InfrastructureModule } from '@/cpin-module/infrastructure/infrastructure.module'
import { VaultModule } from '../vault/vault.module'
import { RegistryClientService } from './registry-client.service'
import { RegistryService } from './registry.service'

@Module({
  imports: [ConfigurationModule, InfrastructureModule, VaultModule],
  providers: [RegistryService, RegistryClientService],
  exports: [RegistryService],
})
export class RegistryModule {}
