import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'
import type { AppAbility, AppAction, AppSubject } from '../middleware/ability.middleware'

export class AbilityGuard implements CanActivate {
  constructor(
    private readonly action: AppAction,
    private readonly subject: AppSubject,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { ability?: AppAbility }>()
    return req.ability?.can(this.action, this.subject) ?? false
  }
}
