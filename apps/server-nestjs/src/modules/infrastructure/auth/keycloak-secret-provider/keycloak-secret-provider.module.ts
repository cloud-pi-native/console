import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { KeycloakSecretProviderService } from './keycloak-secret-provider.service'

@Module({
  imports: [CacheModule.register()],
  providers: [KeycloakSecretProviderService],
  exports: [KeycloakSecretProviderService],
})
export class KeycloakSecretProviderModule {}
