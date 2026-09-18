import type { AdminRoleWithDetails, UserWithAdminRoles } from './keycloak-datastore.service'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { KeycloakClientService } from './keycloak-client.service'
import { KeycloakDatastoreService } from './keycloak-datastore.service'
import { makeGroupRepresentation, makeUserRepresentation } from './keycloak-testing.utils'
import { KeycloakService } from './keycloak.service'

describe('keycloak adminRole event bridge', () => {
  let service: KeycloakService
  let keycloak: ReturnType<typeof mockDeep<KeycloakClientService>>
  let datastore: ReturnType<typeof mockDeep<KeycloakDatastoreService>>

  beforeEach(async () => {
    keycloak = mockDeep<KeycloakClientService>({
      getOrCreateGroupByPath: vi.fn().mockResolvedValue(makeGroupRepresentation({ id: 'kc-group-id', name: 'admin' })),
      getGroupMembers: vi.fn().mockResolvedValue([]),
    })
    datastore = mockDeep<KeycloakDatastoreService>({})

    const moduleRef = await Test.createTestingModule({
      providers: [
        KeycloakService,
        { provide: KeycloakClientService, useValue: keycloak },
        { provide: KeycloakDatastoreService, useValue: datastore },
      ],
    }).compile()

    service = moduleRef.get(KeycloakService)
  })

  it('syncs the impacted role group on adminRole.upsert', async () => {
    const roles: AdminRoleWithDetails[] = [{ id: 'role-1', oidcGroup: '/console/admin', type: 'global' }]
    const users: UserWithAdminRoles[] = [{ id: 'user-1', adminRoleIds: ['role-1'] }]
    datastore.getAllAdminRoles.mockResolvedValue(roles)
    datastore.getAllUsersWithAdminRoleIds.mockResolvedValue(users)
    keycloak.getGroupMembers.mockResolvedValue([makeUserRepresentation({ id: 'user-2' })])

    await service.handleAdminRoleUpsert('role-1')

    expect(keycloak.getOrCreateGroupByPath).toHaveBeenCalledWith('/console/admin')
    expect(keycloak.addUserToGroup).toHaveBeenCalledWith('user-1', 'kc-group-id')
    expect(keycloak.removeUserFromGroup).toHaveBeenCalledWith('user-2', 'kc-group-id')
  })

  it('warns and no-ops when the role no longer exists', async () => {
    datastore.getAllAdminRoles.mockResolvedValue([])
    datastore.getAllUsersWithAdminRoleIds.mockResolvedValue([])

    await service.handleAdminRoleDelete('gone')

    expect(keycloak.getOrCreateGroupByPath).not.toHaveBeenCalled()
  })
})
