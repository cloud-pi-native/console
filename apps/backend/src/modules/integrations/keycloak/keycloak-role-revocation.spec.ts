import type { DeepMockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { KeycloakClientService } from './keycloak-client.service'
import { KeycloakDatastoreService } from './keycloak-datastore.service'
import {
  makeGroupRepresentation,
  makeProjectMember,
  makeProjectRole,
  makeProjectUser,
  makeProjectWithDetails,
  makeUserRepresentation,
} from './keycloak-testing.utils'
import { KeycloakService } from './keycloak.service'

describe('keycloakService role group revocation', () => {
  let service: KeycloakService
  let keycloak: DeepMockProxy<KeycloakClientService>
  let datastore: DeepMockProxy<KeycloakDatastoreService>

  beforeEach(async () => {
    keycloak = mockDeep<KeycloakClientService>({
      ensureConsoleGroup: vi.fn().mockResolvedValue(makeGroupRepresentation({ id: 'console-group-id', name: 'console' })),
      getAllGroups: vi.fn().mockImplementation(async function* () { /* empty */ }),
      deleteGroup: vi.fn().mockResolvedValue(undefined),
    })
    datastore = mockDeep<KeycloakDatastoreService>({
      getAllAdminRoles: vi.fn().mockResolvedValue([]),
      getAllUsersWithAdminRoleIds: vi.fn().mockResolvedValue([]),
    })
    const moduleRef = await Test.createTestingModule({
      providers: [
        KeycloakService,
        { provide: KeycloakClientService, useValue: keycloak },
        { provide: KeycloakDatastoreService, useValue: datastore },
      ],
    }).compile()
    service = moduleRef.get(KeycloakService)
  })

  const mockManagedRoleProject = (roleIds: string[]) => {
    const role = makeProjectRole({
      id: 'role-1',
      permissions: 0n,
      oidcGroup: '/test-project/console/dev',
      type: 'managed',
    })
    datastore.getAllProjects.mockResolvedValue([makeProjectWithDetails({
      id: 'project-id',
      slug: 'test-project',
      ownerId: 'owner-id',
      everyonePerms: 0n,
      roles: [role],
      members: [makeProjectMember({
        user: makeProjectUser({ id: 'user-1', email: 'u1@example.com' }),
        roleIds,
      })],
    })])

    keycloak.ensureGroupByPath.mockResolvedValue(makeGroupRepresentation({ id: 'group-id', name: 'test-project' }))
    keycloak.ensureRoleGroup.mockResolvedValue({
      ...makeGroupRepresentation({ id: 'role-group-id', name: 'dev' }),
      path: '/test-project/console/dev',
    })
    keycloak.getSubGroups.mockImplementation(async function* () { /* empty */ })
    keycloak.getGroupMembers.mockImplementation(async (groupId) => {
      if (groupId === 'group-id') return [makeUserRepresentation({ id: 'owner-id' })]
      if (groupId === 'role-group-id') return [makeUserRepresentation({ id: 'user-1' })]
      return []
    })
  }

  it('removes a member still in the project after their role was withdrawn', async () => {
    mockManagedRoleProject([])

    await service.handleCron()

    expect(keycloak.removeUserFromGroup).toHaveBeenCalledWith('user-1', 'role-group-id')
  })

  it('keeps a member who still holds the role', async () => {
    mockManagedRoleProject(['role-1'])

    await service.handleCron()

    expect(keycloak.removeUserFromGroup).not.toHaveBeenCalledWith('user-1', 'role-group-id')
  })

  it('keeps a member who still holds another role mapped to the same group', async () => {
    const group = '/test-project/console/dev'
    const roleA = makeProjectRole({ id: 'role-a', permissions: 0n, oidcGroup: group, type: 'managed' })
    const roleB = makeProjectRole({ id: 'role-b', permissions: 0n, oidcGroup: group, type: 'managed' })
    datastore.getAllProjects.mockResolvedValue([makeProjectWithDetails({
      id: 'project-id',
      slug: 'test-project',
      ownerId: 'owner-id',
      everyonePerms: 0n,
      roles: [roleA, roleB],
      members: [makeProjectMember({
        user: makeProjectUser({ id: 'user-1', email: 'u1@example.com' }),
        roleIds: ['role-a'],
      })],
    })])
    keycloak.ensureGroupByPath.mockResolvedValue(makeGroupRepresentation({ id: 'console-group-id', name: 'console' }))
    keycloak.ensureRoleGroup.mockResolvedValue({
      ...makeGroupRepresentation({ id: 'role-group-id', name: 'dev' }),
      path: group,
    })
    keycloak.getSubGroups.mockImplementation(async function* () { /* empty */ })
    keycloak.getGroupMembers.mockImplementation(async (groupId) => {
      if (groupId === 'console-group-id') return [makeUserRepresentation({ id: 'owner-id' })]
      if (groupId === 'role-group-id') return [makeUserRepresentation({ id: 'user-1' })]
      return []
    })

    await service.handleCron()

    expect(keycloak.removeUserFromGroup).not.toHaveBeenCalledWith('user-1', 'role-group-id')
  })
})
