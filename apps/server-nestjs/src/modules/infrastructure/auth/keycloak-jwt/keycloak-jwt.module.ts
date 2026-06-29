import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ConfigurationModule } from '../../configuration/configuration.module'
import { DatabaseModule } from '../../database/database.module'
import { KeycloakSecretProviderModule } from '../keycloak-secret-provider/keycloak-secret-provider.module'
import { KeycloakSecretProviderService } from '../keycloak-secret-provider/keycloak-secret-provider.service'
import { KeycloakJwtService } from './keycloak-jwt.service'

@Module({
  imports: [
    DatabaseModule,
    JwtModule.registerAsync({
      imports: [ConfigurationModule, KeycloakSecretProviderModule],
      inject: [KeycloakSecretProviderService],
      useFactory: async (client: KeycloakSecretProviderService) => {
        // The issuer is fetched from the openid-configuration endpoint
        // rather than reconstructed from env vars, as the server may be
        // behind a reverse proxy that differs from the public-facing domain.
        const issuer = await client.fetchIssuer()
        return {
          secretOrKeyProvider: (requestType, tokenOrPayload) => client.getSecret(requestType, tokenOrPayload),
          // Keycloak tokens currently do not include an audience claim for this app.
          verifyOptions: {
            algorithms: ['RS256'],
            issuer,
          },
        }
      },
    }),
  ],
  providers: [KeycloakJwtService],
  exports: [KeycloakJwtService, JwtModule],
})
export class KeycloakJwtModule {}
