import { Module } from '@nestjs/common'
import { KeycloakService } from './keycloak.service'
import { KeycloakControllerService } from './keycloak-controller.service'
import { KeycloakDatastoreService } from './keycloak-datastore.service'
import { KeycloakClientService } from './keycloak-client.service'
import { ConfigurationModule } from '../../cpin-module/infrastructure/configuration/configuration.module'
import { InfrastructureModule } from '../../cpin-module/infrastructure/infrastructure.module'
import { KeycloakHealthService } from './keycloak-health.service'

@Module({
  imports: [ConfigurationModule, InfrastructureModule],
  providers: [KeycloakService, KeycloakControllerService, KeycloakDatastoreService, KeycloakClientService],
  exports: [KeycloakService, KeycloakHealthService],
})
export class KeycloakModule {}
