import { PROJECT_PERMS } from '@cpn-console/shared'
import { describe, expect, it } from 'vitest'
import { isUuid, makeProjectSelect, resolveProjectPermissions } from './project-loader.utils'

const UUID = '0b3f7e58-1e2a-4c6b-9d0e-5f6a7b8c9d01'

function makeRaw(overrides: Partial<Parameters<typeof resolveProjectPermissions>[0]> = {}): Parameters<typeof resolveProjectPermissions>[0] {
  return {
    ownerId: 'owner-id',
    everyonePerms: 0n,
    roles: [{ id: 'role-1', permissions: PROJECT_PERMS.LIST_REPOSITORIES }],
    members: [{ userId: 'member-id', roleIds: ['role-1'] }],
    ...overrides,
  }
}

describe('makeProjectSelect', () => {
  it('includes every block by default', () => {
    const select = makeProjectSelect()
    expect(Object.keys(select)).toEqual(expect.arrayContaining(['id', 'slug', 'status', 'locked', 'ownerId', 'everyonePerms', 'roles', 'members']))
  })

  it('omits status, locked and permissions when disabled', () => {
    const select = makeProjectSelect({ includeStatus: false, includeLocked: false, includePermissions: false })
    expect(select).not.toHaveProperty('status')
    expect(select).not.toHaveProperty('locked')
    expect(select).not.toHaveProperty('ownerId')
    expect(select).not.toHaveProperty('roles')
    expect(select).not.toHaveProperty('members')
  })
})

describe('resolveProjectPermissions', () => {
  it('grants MANAGE to the owner regardless of roles', () => {
    expect(resolveProjectPermissions(makeRaw(), 'owner-id')).toBe(PROJECT_PERMS.MANAGE)
  })

  it('returns no permission for a non-member', () => {
    expect(resolveProjectPermissions(makeRaw(), 'stranger-id')).toBe(0n)
  })

  it('unions everyonePerms, GUEST and the permissions of the member roles', () => {
    const raw = makeRaw({
      everyonePerms: PROJECT_PERMS.LIST_ENVIRONMENTS,
      roles: [
        { id: 'role-1', permissions: PROJECT_PERMS.LIST_REPOSITORIES },
        { id: 'role-2', permissions: PROJECT_PERMS.SEE_SECRETS },
      ],
      members: [{ userId: 'member-id', roleIds: ['role-1', 'role-2', 'role-unknown'] }],
    })
    expect(resolveProjectPermissions(raw, 'member-id')).toBe(
      PROJECT_PERMS.LIST_ENVIRONMENTS | PROJECT_PERMS.LIST_REPOSITORIES | PROJECT_PERMS.SEE_SECRETS | PROJECT_PERMS.GUEST,
    )
  })

  it('still grants GUEST to a member without any matching role', () => {
    const raw = makeRaw({ members: [{ userId: 'member-id', roleIds: [] }] })
    expect(resolveProjectPermissions(raw, 'member-id')).toBe(PROJECT_PERMS.GUEST)
  })
})

describe('isUuid', () => {
  it('accepts a canonical uuid', () => {
    expect(isUuid(UUID)).toBe(true)
  })

  it('accepts uppercase uuid', () => {
    expect(isUuid(UUID.toUpperCase())).toBe(true)
  })

  it('rejects a slug and a malformed id', () => {
    expect(isUuid('my-project-slug')).toBe(false)
    expect(isUuid('0b3f7e58-1e2a-4c6b-9d0e-5f6a7b8c9d0')).toBe(false)
  })
})
