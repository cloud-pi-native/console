import { Test } from '@nestjs/testing'
import type { TestingModule } from '@nestjs/testing'
import { KeycloakService } from './keycloak.service'
import { KeycloakClientService } from './keycloak-client.service'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { describe, it, expect, beforeEach } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import type GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation'
import { makeGroupRepresentation } from './keycloack-testing.utils'

const keycloakMock = mockDeep<KeycloakClientService>()

function createKeycloakServiceTestModule() {
  return Test.createTestingModule({
    providers: [
      KeycloakService,
      {
        provide: KeycloakClientService,
        useValue: keycloakMock,
      },
      {
        provide: ConfigurationService,
        useValue: mockDeep<ConfigurationService>(),
      },
    ],
  })
}

describe('keycloak', () => {
  let service: KeycloakService

  beforeEach(async () => {
    const module: TestingModule = await createKeycloakServiceTestModule().compile()
    service = module.get<KeycloakService>(KeycloakService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getOrCreateGroupByPath', () => {
    it('should return existing group if found by path', async () => {
      const groupA: GroupRepresentation = makeGroupRepresentation({ id: 'id-a', name: 'a', path: '/a' })
      const groupB: GroupRepresentation = makeGroupRepresentation({ id: 'id-b', name: 'b', path: '/a/b' })

      // First call to getGroupByName('a')
      keycloakMock.groups.find.mockResolvedValueOnce([groupA])

      // Call to getSubGroups('id-a')
      keycloakMock.groups.listSubGroups.mockResolvedValueOnce([groupB])

      // When checking 'b', it matches groupB.name
      const result = await service.getOrCreateGroupByPath('a/b')

      expect(result).toEqual(groupB)
    })

    it('should create groups if they do not exist', async () => {
      // At the first call to getGroupByName('new'), it returns empty
      keycloakMock.groups.find.mockResolvedValueOnce([])

      // Create 'new' group
      keycloakMock.groups.find.mockResolvedValueOnce([])
      keycloakMock.groups.create.mockResolvedValue({ id: 'id-new' })

      // Create 'group' subgroup
      keycloakMock.groups.listSubGroups.mockResolvedValueOnce([])
      keycloakMock.groups.createChildGroup.mockResolvedValue({ id: 'id-group' })

      const result = await service.getOrCreateGroupByPath('new/group')

      expect(result).toEqual({ id: 'id-group', name: 'group', path: 'new/group' })
      expect(keycloakMock.groups.create).toHaveBeenCalledWith({ name: 'new' })
      expect(keycloakMock.groups.createChildGroup).toHaveBeenCalledWith({ id: 'id-new' }, { name: 'group' })
    })
  })
})
