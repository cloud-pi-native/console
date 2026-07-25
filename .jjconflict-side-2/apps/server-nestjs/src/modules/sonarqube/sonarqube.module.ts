import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { VaultModule } from '../vault/vault.module'
import { SonarqubeClientService } from './sonarqube-client.service'
import { SonarqubeDatastoreService } from './sonarqube-datastore.service'
import { SonarqubeHealthService } from './sonarqube-health.service'
import { SonarqubeHttpClientService } from './sonarqube-http-client.service'
import { SonarqubePluginService } from './sonarqube-plugin.service'
import { ConfigurableModuleClass } from './sonarqube.module-definition'
import { SonarqubeService } from './sonarqube.service'

@Module({
  imports: [DatabaseModule, TerminusModule, VaultModule],
  providers: [
    SonarqubeHealthService,
    SonarqubeHttpClientService,
    SonarqubeClientService,
    SonarqubeDatastoreService,
    SonarqubePluginService,
    SonarqubeService,
  ],
  exports: [SonarqubeClientService, SonarqubeHealthService, SonarqubePluginService, SonarqubeService],
})
export class SonarqubeModule extends ConfigurableModuleClass {}
