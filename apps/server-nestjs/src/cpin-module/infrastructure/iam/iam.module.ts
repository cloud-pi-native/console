import type { ExecutionContext } from '@nestjs/common'
import { Injectable, Module } from '@nestjs/common'
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
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
import { AbilityInterceptor } from './middleware/ability.middleware'

export const API_USER = Symbol('API_USER')

@Injectable()
class KeycloakRequestUserGuard extends AuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const canActivate = await super.canActivate(context)
    const req = context.switchToHttp().getRequest<Record<string, any>>()
    const tokenPayload
      = req?.user
        ?? req?.kauth?.grant?.access_token?.content
        ?? req?.kauth?.grant?.id_token?.content
        ?? undefined
    if (tokenPayload && !req.user) {
      req.user = tokenPayload
    }
    return canActivate
  }
}

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
      useClass: KeycloakRequestUserGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AbilityInterceptor,
    },
  ],
})
export class IamModule {}
