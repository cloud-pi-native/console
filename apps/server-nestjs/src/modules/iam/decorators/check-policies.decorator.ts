import { SetMetadata } from '@nestjs/common'
import type { AppAbility } from '../factories/casl-ability.factory'

export interface IPolicyHandler {
  handle: (ability: AppAbility) => boolean
}

type PolicyHandlerCallback = (ability: AppAbility) => boolean

export type PolicyHandler = IPolicyHandler | PolicyHandlerCallback

export const CHECK_POLICIES_KEY = 'check_policy'
export function CheckPolicies(...handlers: PolicyHandler[]) {
  return SetMetadata(CHECK_POLICIES_KEY, handlers)
}
