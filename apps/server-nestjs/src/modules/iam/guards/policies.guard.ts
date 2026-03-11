import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { Inject, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { CaslAbilityFactory } from '../factories/casl-ability.factory'
import type { AppAbility } from '../factories/casl-ability.factory'
import type { PolicyHandler } from '../decorators/check-policies.decorator'
import { CHECK_POLICIES_KEY } from '../decorators/check-policies.decorator'

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private reflector: Reflector,
    @Inject(CaslAbilityFactory) private caslAbilityFactory: CaslAbilityFactory,
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
