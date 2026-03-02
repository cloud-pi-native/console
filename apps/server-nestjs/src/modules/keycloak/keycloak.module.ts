import { Module } from '@nestjs/common'
import { KeycloakService } from './keycloak.service'
import { KeycloakControllerService } from './keycloak-controller.service'
import { KeycloakDatastoreService } from './keycloak-datastore.service'
import { ConfigurationModule } from '../../cpin-module/infrastructure/configuration/configuration.module'
import { InfrastructureModule } from '../../cpin-module/infrastructure/infrastructure.module'

@Module({
  imports: [ConfigurationModule, InfrastructureModule],
  providers: [KeycloakService, KeycloakControllerService, KeycloakDatastoreService],
  exports: [KeycloakService],
})
export class KeycloakModule {}
