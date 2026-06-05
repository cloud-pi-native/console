import { forwardRef, Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ConfigurationModule } from '../configuration/configuration.module'
import { ConfigurationService } from '../configuration/configuration.service'
import { DatabaseModule } from '../database/database.module'
import { AdminModule } from './admin/admin.module'
import { AuthService } from './auth.service'
import { KeycloakJwtModule } from './keycloak-jwt/keycloak-jwt.module'
import { KeycloakJwtService } from './keycloak-jwt/keycloak-jwt.service'
import { ProjectModule } from './project/project.module'

const JwtModuleConfig = JwtModule.registerAsync({
  imports: [ConfigurationModule, KeycloakJwtModule],
  inject: [ConfigurationService, KeycloakJwtService],
  useFactory: (config: ConfigurationService, keycloakJwtService: KeycloakJwtService) => ({
    secretOrKeyProvider: async (_requestType, tokenOrPayload) => {
      const decoded = keycloakJwtService.decodeJweHeader(tokenOrPayload)
      if (!decoded?.kid) throw new Error('Missing kid')
      const publicKey = await keycloakJwtService.getPublicKey(decoded.kid)
      if (!publicKey) throw new Error('Unknown signing key')
      return publicKey
    },
    verifyOptions: {
      algorithms: ['RS256'],
      audience: keycloakJwtService.getAudience(),
      issuer: config.getKeycloakIssuer(),
    },
  }),
})

@Module({
  imports: [
    forwardRef(() => AdminModule),
    ProjectModule,
    ConfigurationModule,
    DatabaseModule,
    JwtModuleConfig,
    KeycloakJwtModule,
  ],
  providers: [
    AuthService,
  ],
  exports: [
    AuthService,
    JwtModuleConfig,
    AdminModule,
    ProjectModule,
  ],
})
export class AuthModule {}
