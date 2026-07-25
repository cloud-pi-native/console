import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { keycloakConfigFactory } from '../../../config/keycloak.config'
import { AuthService } from './auth.service'
import { DsoTokenModule } from './dso-token/dso-token.module'
import { KeycloakJwtModule } from './keycloak-jwt/keycloak-jwt.module'

@Module({
  imports: [ConfigModule.forFeature(keycloakConfigFactory), DsoTokenModule, KeycloakJwtModule],
  providers: [
    AuthService,
  ],
  exports: [
    AuthService,
    KeycloakJwtModule,
  ],
})
export class AuthModule {}
