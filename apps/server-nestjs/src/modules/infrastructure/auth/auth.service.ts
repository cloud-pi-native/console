import type { FastifyRequest } from 'fastify'
import type { AuthRequirements, UserContext } from './dso-token/dso-token.service'
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { DsoTokenService } from './dso-token/dso-token.service'
import { KeycloakJwtService } from './keycloak-jwt/keycloak-jwt.service'

export type { AuthRequirements, AuthToken, UserContext } from './dso-token/dso-token.service'

@Injectable()
export class AuthService {
  constructor(
    @Inject(DsoTokenService) private readonly dsoTokenService: DsoTokenService,
    @Inject(KeycloakJwtService) private readonly keycloakJwtService: KeycloakJwtService,
  ) {}

  async authenticate(
    request: FastifyRequest,
    requirements?: AuthRequirements,
  ): Promise<UserContext> {
    const dsoTokenResult = await this.dsoTokenService.authenticate(request, requirements)
    if (dsoTokenResult) {
      return dsoTokenResult
    }

    const bearerTokenResult = await this.keycloakJwtService.authenticate(request, requirements)
    if (bearerTokenResult) {
      return bearerTokenResult
    }

    throw new UnauthorizedException('Not authenticated')
  }
}
