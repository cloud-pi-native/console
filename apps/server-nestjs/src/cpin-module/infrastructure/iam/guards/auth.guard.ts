import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'
import type { VerifiedJwtPayload } from '../auth.service'
import { tokenHeaderName } from '@cpn-console/shared'
import { Inject, Injectable } from '@nestjs/common'
import { AuthService } from '../auth.service'

export interface RequestUser {
  user?: VerifiedJwtPayload | null
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http')
      return true

    const request = context.switchToHttp().getRequest<Request & RequestUser>()
    if (request.user)
      return true

    const token = request.headers[tokenHeaderName]
    if (typeof token !== 'string')
      return false

    const payload = await this.authService.verifyToken(token)
    if (!payload)
      return false
    request.user = payload

    return true
  }
}
