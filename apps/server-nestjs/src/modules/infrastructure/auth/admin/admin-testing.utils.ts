import type { UserContext } from '../auth.service'
import type { AdminPolicyConfig } from './admin-policy.service'

export function makeAdminPolicy(overrides: Partial<AdminPolicyConfig> = {}): AdminPolicyConfig {
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
