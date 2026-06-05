import type { UserContext } from '../../auth/auth.service'
import type { UserPolicyConfig } from './user-policy.service'

export function makeUserPolicy(overrides: Partial<UserPolicyConfig> = {}): UserPolicyConfig {
  return {
    adminPermissions: [],
    userTypes: [],
    ...overrides,
  }
}

export function makeUserContext(overrides: Partial<UserContext> = {}): UserContext {
  return {
    userId: 'test-user',
    ...overrides,
  }
}
