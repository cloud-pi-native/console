import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TerminusModule } from '@nestjs/terminus'
import vaultConfigFactory from '../../config/vault'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { VaultClientService } from './vault-client.service'
import { VaultDatastoreService } from './vault-datastore.service'
import { VaultHealthService } from './vault-health.service'
import { VaultHttpClientService } from './vault-http-client.service'
import { VaultPluginService } from './vault-plugin.service'
import { VaultService } from './vault.service'

@Module({
  imports: [DatabaseModule, TerminusModule, ConfigModule.forFeature([vaultConfigFactory])],
  providers: [
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
