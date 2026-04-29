import { Module } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { ConfigurationModule } from '../infrastructure/configuration/configuration.module'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { VaultModule } from '../vault/vault.module'
import { SonarqubeClientService } from './sonarqube-client.service'
import { SonarqubeDatastoreService } from './sonarqube-datastore.service'
import { SonarqubeHealthService } from './sonarqube-health.service'
import { SonarqubeHttpClientService } from './sonarqube-http-client.service'
import { SonarqubeService } from './sonarqube.service'

@Module({
  imports: [ConfigurationModule, InfrastructureModule, VaultModule],
  providers: [
    HealthIndicatorService,
    SonarqubeHttpClientService,
    SonarqubeClientService,
    SonarqubeDatastoreService,
    SonarqubeHealthService,
    SonarqubeService,
  ],
  exports: [SonarqubeClientService, SonarqubeHealthService],
})
export class SonarqubeModule {}
