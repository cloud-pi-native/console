import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { ConfigurationModule } from '../../configuration/configuration.module'
import { KeycloakSecretProviderService } from './keycloak-secret-provider.service'

@Module({
  imports: [CacheModule.register(), ConfigurationModule],
  providers: [KeycloakSecretProviderService],
  exports: [KeycloakSecretProviderService],
})
export class KeycloakSecretProviderModule {}
