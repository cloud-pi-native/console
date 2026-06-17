import { Module } from '@nestjs/common'
import { AuthService } from './auth.service'
import { DsoTokenModule } from './dso-token/dso-token.module'
import { KeycloakJwtModule } from './keycloak-jwt/keycloak-jwt.module'

@Module({
  imports: [DsoTokenModule, KeycloakJwtModule],
  providers: [
    AuthService,
  ],
  exports: [
    AuthService,
    KeycloakJwtModule,
  ],
})
export class AuthModule {}
