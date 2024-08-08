import { beforeEach, vi } from 'vitest'
import { mockDeep, mockReset } from 'vitest-mock-extended'

vi.mock('../utils/hook-wrapper.ts')

export const hook = {
  project: {
    upsert: vi.fn(),
    delete: vi.fn(),
    getSecrets: vi.fn(),
  },
  misc: {
    checkServices: vi.fn(),
    fetchOrganizations: vi.fn(),
    syncRepository: vi.fn(),
  },
  cluster: {
    delete: vi.fn(),
    upsert: vi.fn(),
  },
  user: {
    retrieveAdminUsers: vi.fn(),
    retrieveUserByEmail: vi.fn(),
    updateUserAdminGroupMembership: vi.fn(),
  },
} as const

const hookMock = mockDeep<typeof hook>()

beforeEach(() => {
  // reset les mocks
  mockReset(hookMock)
})
