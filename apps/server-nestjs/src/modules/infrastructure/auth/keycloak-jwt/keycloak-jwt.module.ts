import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ConfigurationModule } from '../../configuration/configuration.module'
import { ConfigurationService } from '../../configuration/configuration.service'
import { DatabaseModule } from '../../database/database.module'
import { KeycloakSecretProviderModule } from '../keycloak-secret-provider/keycloak-secret-provider.module'
import { KeycloakSecretProviderService } from '../keycloak-secret-provider/keycloak-secret-provider.service'
import { KeycloakJwtService } from './keycloak-jwt.service'

@Module({
  imports: [
    DatabaseModule,
    JwtModule.registerAsync({
      imports: [ConfigurationModule, KeycloakSecretProviderModule],
      inject: [ConfigurationService, KeycloakSecretProviderService],
      useFactory: (config: ConfigurationService, client: KeycloakSecretProviderService) => {
        return {
          secretOrKeyProvider: (requestType, tokenOrPayload) => client.getSecret(requestType, tokenOrPayload),
          // Keycloak tokens currently do not include an audience claim for this app.
          verifyOptions: {
            algorithms: ['RS256'],
            issuer: config.getPublicKeycloakRealmUrl(),
          },
        }
      },
    }),
  ],
  providers: [KeycloakJwtService],
  exports: [KeycloakJwtService, JwtModule],
})
export class KeycloakJwtModule {}
