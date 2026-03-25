import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'
import type { AppAbility, AppAction, AppSubject, AuthUser } from '../middleware/ability.middleware'
import { createAbilityForUser } from '../middleware/ability.middleware'

export class AbilityGuard implements CanActivate {
  constructor(
    private readonly action: AppAction,
    private readonly subject: AppSubject,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser, ability?: AppAbility }>()
    const ability = req.ability ?? createAbilityForUser(req.user)
    return ability.can(this.action, this.subject)
  }
}
