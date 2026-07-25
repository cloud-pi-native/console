import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { keycloakConfigFactory } from '../../../../config/keycloak.config'
import { KeycloakSecretProviderService } from './keycloak-secret-provider.service'

@Module({
  imports: [
    CacheModule.register(),
    ConfigModule.forFeature(keycloakConfigFactory),
  ],
  providers: [KeycloakSecretProviderService],
  exports: [KeycloakSecretProviderService],
})
export class KeycloakSecretProviderModule {}
