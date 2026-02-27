import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import {
  AuthGuard,
  ResourceGuard,
  KeycloakConnectModule,
  PolicyEnforcementMode,
  TokenValidation,
} from 'nest-keycloak-connect'
import { ConfigurationModule } from '../../cpin-module/infrastructure/configuration/configuration.module'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import { PoliciesGuard } from './guards/policies.guard'
import { CaslAbilityFactory } from './factories/casl-ability.factory'

@Module({
  imports: [
    ConfigurationModule,
    KeycloakConnectModule.registerAsync({
      imports: [ConfigurationModule],
      useFactory: (configService: ConfigurationService) => ({
        authServerUrl: `${configService.keycloakProtocol}://${configService.keycloakDomain}`,
        realm: configService.keycloakRealm!,
        clientId: configService.keycloakClientId!,
        secret: configService.keycloakClientSecret!,
        policyEnforcement: PolicyEnforcementMode.PERMISSIVE,
        tokenValidation: TokenValidation.ONLINE,
      }),
      inject: [ConfigurationService],
    }),
  ],
  providers: [
    CaslAbilityFactory,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ResourceGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PoliciesGuard,
    },
  ],
  exports: [CaslAbilityFactory],
})
export class IamModule {}
