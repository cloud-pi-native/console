import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { ConfigurationModule } from '../../configuration/configuration.module'
import { DatabaseModule } from '../../database/database.module'
import { KeycloakJwtClientService } from './keycloak-jwt-client.service'
import { KeycloakJwtService } from './keycloak-jwt.service'

@Module({
  imports: [ConfigurationModule, DatabaseModule, CacheModule.register()],
  providers: [KeycloakJwtClientService, KeycloakJwtService],
  exports: [KeycloakJwtClientService, KeycloakJwtService],
})
export class KeycloakJwtModule {}
