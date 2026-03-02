import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { Injectable } from '@nestjs/common'
import type { Reflector } from '@nestjs/core'
import type { CaslAbilityFactory, AppAbility } from '../factories/casl-ability.factory'
import type { PolicyHandler } from '../decorators/check-policies.decorator'
import { CHECK_POLICIES_KEY } from '../decorators/check-policies.decorator'

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policyHandlers
      = this.reflector.get<PolicyHandler[]>(
        CHECK_POLICIES_KEY,
        context.getHandler(),
      ) || []

    const { user } = context.switchToHttp().getRequest()
    const ability = this.caslAbilityFactory.createForUser(user)

    return policyHandlers.every(handler =>
      this.execPolicyHandler(handler, ability),
    )
  }

  private execPolicyHandler(handler: PolicyHandler, ability: AppAbility) {
    if (typeof handler === 'function') {
      return handler(ability)
    }
    return handler.handle(ability)
  }
}
