import type { FastifyRequest } from 'fastify'
import type { AuthRequirements, UserContext } from './dso-token/dso-token.service'
import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { DsoTokenService } from './dso-token/dso-token.service'
import { KeycloakJwtService } from './keycloak-jwt/keycloak-jwt.service'

export type { AuthRequirements, AuthToken, UserContext } from './dso-token/dso-token.service'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

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
      this.logger.debug(`Auth authenticated request (requestId=${request.id}, authSource=dso-token, userId=${dsoTokenResult.userId}, adminPermissions=${dsoTokenResult.adminPermissions?.toString()}, userType=${dsoTokenResult.userType})`)
      return dsoTokenResult
    }

    const bearerTokenResult = await this.keycloakJwtService.authenticate(request, requirements)
    if (bearerTokenResult) {
      this.logger.debug(`Auth authenticated request (requestId=${request.id}, authSource=keycloak-jwt, userId=${bearerTokenResult.userId}, adminPermissions=${bearerTokenResult.adminPermissions?.toString()}, userType=${bearerTokenResult.userType})`)
      return bearerTokenResult
    }

    this.logger.warn(`Auth rejected request (requestId=${request.id}, hasDsoTokenHeader=${typeof request.headers['x-dso-token'] === 'string'}, hasAuthorizationHeader=${typeof request.headers.authorization === 'string'})`)

    throw new UnauthorizedException('Not authenticated')
  }
}
