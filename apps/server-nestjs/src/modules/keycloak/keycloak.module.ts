import { Module } from '@nestjs/common'
import { KeycloakService } from './keycloak.service'
import { KeycloakControllerService } from './keycloak-controller.service'
import { KeycloakDatastoreService } from './keycloak-datastore.service'
import { ConfigurationModule } from '../../cpin-module/infrastructure/configuration/configuration.module'

@Module({
  imports: [ConfigurationModule],
  providers: [KeycloakService, KeycloakControllerService, KeycloakDatastoreService],
  exports: [KeycloakService],
})
export class KeycloakModule {}
