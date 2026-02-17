import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ADMIN_PERMS } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'

const mockedGetSystemSettings = vi.fn()
const mockedLogViaSession = vi.fn()

vi.mock('@/resources/system/settings/business.js', () => ({
  getSystemSettings: mockedGetSystemSettings,
}))
vi.mock('@/resources/user/business.js', () => ({
  logViaSession: mockedLogViaSession,
  logViaToken: vi.fn(),
}))

describe('authUser effective admin permissions via legacy default permissions', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns raw permissions when legacy-permissions is off', async () => {
    const rawPerms = ADMIN_PERMS.MANAGE
    const user = { id: faker.string.uuid(), email: faker.internet.email(), firstName: faker.person.firstName(), lastName: faker.person.lastName(), type: 'human' as const }
    const req = { session: { user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, groups: [] } } }

    mockedGetSystemSettings.mockResolvedValueOnce([{ key: 'legacy-permissions', value: 'off' }])
    mockedLogViaSession.mockResolvedValueOnce({ user, adminPerms: rawPerms })

    const controller = await import('./controller.js')
    const res = await controller.authUser(req as any)
    expect(res.adminPermissions).toEqual(rawPerms)
  })

  it('enables only ManageProjects when legacy-permissions is on and MANAGE set', async () => {
    const rawPerms = ADMIN_PERMS.MANAGE
    const expected = (rawPerms & ~ADMIN_PERMS.MANAGE) | ADMIN_PERMS.MANAGE_PROJECTS
    const user = { id: faker.string.uuid(), email: faker.internet.email(), firstName: faker.person.firstName(), lastName: faker.person.lastName(), type: 'human' as const }
    const req = { session: { user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, groups: [] } } }

    mockedGetSystemSettings.mockResolvedValueOnce([{ key: 'legacy-permissions', value: 'on' }])
    mockedLogViaSession.mockResolvedValueOnce({ user, adminPerms: rawPerms })

    const controller = await import('./controller.js')
    const res = await controller.authUser(req as any)
    expect(res.adminPermissions).toEqual(expected)
  })

  it('adds ManageProjects when legacy-permissions is on and MANAGE not set', async () => {
    const rawPerms = ADMIN_PERMS.LIST_STAGES
    const expected = rawPerms | ADMIN_PERMS.MANAGE_PROJECTS
    const user = { id: faker.string.uuid(), email: faker.internet.email(), firstName: faker.person.firstName(), lastName: faker.person.lastName(), type: 'human' as const }
    const req = { session: { user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, groups: [] } } }

    mockedGetSystemSettings.mockResolvedValueOnce([{ key: 'legacy-permissions', value: 'on' }])
    mockedLogViaSession.mockResolvedValueOnce({ user, adminPerms: rawPerms })

    const controller = await import('./controller.js')
    const res = await controller.authUser(req as any)
    expect(res.adminPermissions).toEqual(expected)
  })
})
