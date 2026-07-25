import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TerminusModule } from '@nestjs/terminus'
import { baseConfigFactory } from '../../config/base.config'
import { vaultConfigFactory } from '../../config/vault.config'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { VaultClientService } from './vault-client.service'
import { VaultDatastoreService } from './vault-datastore.service'
import { VaultHealthService } from './vault-health.service'
import { VaultHttpClientService } from './vault-http-client.service'
import { VaultPluginService } from './vault-plugin.service'
import { ConfigurableModuleClass } from './vault.module-definition'
import { VaultService } from './vault.service'

@Module({
  imports: [DatabaseModule, TerminusModule, ConfigModule.forFeature(vaultConfigFactory), ConfigModule.forFeature(baseConfigFactory)],
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
export class VaultModule extends ConfigurableModuleClass {}
