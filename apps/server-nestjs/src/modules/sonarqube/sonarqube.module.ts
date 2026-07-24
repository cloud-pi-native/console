import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TerminusModule } from '@nestjs/terminus'
import sonarqubeConfigFactory from '../../config/sonarqube'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { VaultModule } from '../vault/vault.module'
import { SonarqubeClientService } from './sonarqube-client.service'
import { SonarqubeDatastoreService } from './sonarqube-datastore.service'
import { SonarqubeHealthService } from './sonarqube-health.service'
import { SonarqubeHttpClientService } from './sonarqube-http-client.service'
import { SonarqubePluginService } from './sonarqube-plugin.service'
import { SonarqubeService } from './sonarqube.service'

@Module({
  imports: [DatabaseModule, TerminusModule, VaultModule, ConfigModule.forFeature([sonarqubeConfigFactory])],
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
export class SonarqubeModule {}
