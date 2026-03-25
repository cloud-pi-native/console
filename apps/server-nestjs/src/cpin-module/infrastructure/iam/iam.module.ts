import type { MiddlewareConsumer, NestModule } from '@nestjs/common'
import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import {
  AuthGuard,
  KeycloakConnectModule,
  PolicyEnforcementMode,
  TokenValidation,
} from 'nest-keycloak-connect'
import { ConfigurationModule } from '../configuration/configuration.module'
import { ConfigurationService } from '../configuration/configuration.service'
import { DatabaseModule } from '../database/database.module'
import { AbilityGuard } from './guards/ability.guard'
import { AbilityMiddleware } from './middleware/ability.middleware'

export const API_USER = Symbol('API_USER')

@Module({
  imports: [
    ConfigurationModule,
    DatabaseModule,
    KeycloakConnectModule.registerAsync({
      imports: [ConfigurationModule],
      inject: [ConfigurationService],
      useFactory: (config: ConfigurationService) => ({
        authServerUrl: `${config.keycloakProtocol}://${config.keycloakDomain}`,
        realm: config.keycloakRealm ?? '',
        clientId: config.keycloakClientId ?? '',
        secret: config.keycloakClientSecret ?? '',
        policyEnforcement: PolicyEnforcementMode.PERMISSIVE,
        tokenValidation: TokenValidation.ONLINE,
      }),
    }),
  ],
  providers: [
    AbilityGuard,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class IamModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AbilityMiddleware).forRoutes('*')
  }
}
