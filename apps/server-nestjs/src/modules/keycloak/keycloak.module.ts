import { Module } from '@nestjs/common'
import { KeycloakService } from './keycloak.service'
import { KeycloakReconcilerService } from './keycloak-reconciler.service'
import { ConfigurationModule } from '../../cpin-module/infrastructure/configuration/configuration.module'

@Module({
  imports: [ConfigurationModule],
  providers: [KeycloakService, KeycloakReconcilerService],
  exports: [KeycloakService],
})
export class KeycloakModule {}
