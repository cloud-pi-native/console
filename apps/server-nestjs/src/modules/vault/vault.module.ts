import { Module } from '@nestjs/common'
import { ConfigurationModule } from '../../cpin-module/infrastructure/configuration/configuration.module'
import { VaultService } from './vault.service'

@Module({
  imports: [ConfigurationModule],
  providers: [VaultService],
  exports: [VaultService],
})
export class VaultModule {}
