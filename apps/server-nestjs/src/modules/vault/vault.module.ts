import { Module } from '@nestjs/common'
import { ConfigurationModule } from '../../cpin-module/infrastructure/configuration/configuration.module'
import { VaultClientService } from './vault-client.service'
import { VaultService } from './vault.service'

@Module({
  imports: [ConfigurationModule],
  providers: [VaultService, VaultClientService],
  exports: [VaultService],
})
export class VaultModule {}
