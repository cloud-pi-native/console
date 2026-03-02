import { Module } from '@nestjs/common'
import { KeycloakService } from './keycloak.service'
import { KeycloakControllerService } from './keycloak-controller.service'
import { ConfigurationModule } from '../../cpin-module/infrastructure/configuration/configuration.module'

@Module({
  imports: [ConfigurationModule],
  providers: [KeycloakService, KeycloakControllerService],
  exports: [KeycloakService],
})
export class KeycloakModule {}
