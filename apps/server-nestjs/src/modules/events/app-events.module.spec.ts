import type { ConfigType } from '@nestjs/config'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { gitlabConfigFactory } from '../../config/gitlab.config'
import { GitlabClientService } from '../gitlab/gitlab-client.service'
import { GitlabDatastoreService } from '../gitlab/gitlab-datastore.service'
import { GitlabService } from '../gitlab/gitlab.service'
import { KeycloakClientService } from '../keycloak/keycloak-client.service'
import { KeycloakDatastoreService } from '../keycloak/keycloak-datastore.service'
import { makeGroupRepresentation } from '../keycloak/keycloak-testing.utils'
import { KeycloakService } from '../keycloak/keycloak.service'
import { VaultClientService } from '../vault/vault-client.service'
import { makeAdminRoleEventMember, makeAdminRoleEventPayload } from './app-events-testing.utils'

describe('appEventsModule', () => {
  let eventEmitter: EventEmitter2
  let keycloak: DeepMockProxy<KeycloakClientService>
  let gitlab: DeepMockProxy<GitlabClientService>

  beforeEach(async () => {
    keycloak = mockDeep<KeycloakClientService>({
      getOrCreateGroupByPath: vi.fn().mockResolvedValue(makeGroupRepresentation({ id: 'kc-group-id', name: 'admin' })),
      getGroupMembers: vi.fn().mockResolvedValue([]),
    })
    gitlab = mockDeep<GitlabClientService>({
      upsertUser: vi.fn().mockResolvedValue({ id: 1 }),
    })

    const moduleRef = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        KeycloakService,
        GitlabService,
        { provide: KeycloakClientService, useValue: keycloak },
        { provide: KeycloakDatastoreService, useValue: mockDeep<KeycloakDatastoreService>({
          getAllAdminRoles: vi.fn().mockResolvedValue([{ id: 'role-1', oidcGroup: '/console/admin', type: 'global' }]),
          getAllUsersWithAdminRoleIds: vi.fn().mockResolvedValue([{ id: 'user-1', adminRoleIds: ['role-1'] }]),
        }) },
        { provide: GitlabClientService, useValue: gitlab },
        { provide: GitlabDatastoreService, useValue: mockDeep<GitlabDatastoreService>({
          getAdminPluginConfig: vi.fn().mockResolvedValue(null),
        }) },
        { provide: VaultClientService, useValue: mockDeep<VaultClientService>() },
        { provide: gitlabConfigFactory.KEY, useValue: mockDeep<ConfigType<typeof gitlabConfigFactory>>({}) },
      ],
    }).compile()

    const app = moduleRef.createNestApplication()
    await app.init()

    eventEmitter = moduleRef.get(EventEmitter2)
  })

  it('delivers the canonical AdminRoleEventPayload to both consumers on adminRole.upsert', async () => {
    const payload = makeAdminRoleEventPayload({
      id: 'role-1',
      oidcGroup: '/console/admin',
      members: [
        makeAdminRoleEventMember({
          id: 'u1',
          email: 'a@b.c',
          firstName: 'A',
          lastName: 'B',
        }),
      ],
    })

    const results = await eventEmitter.emitAsync('adminRole.upsert', payload)

    expect(keycloak.getOrCreateGroupByPath).toHaveBeenCalledWith('/console/admin')
    expect(keycloak.addUserToGroup).toHaveBeenCalledWith('user-1', 'kc-group-id')

    expect(gitlab.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'a@b.c', admin: true }),
      { cpnUserId: 'u1' },
    )

    expect(results).toEqual(expect.arrayContaining([
      { keycloak: expect.objectContaining({ status: 'OK' }) },
      { gitlab: expect.objectContaining({ status: 'OK' }) },
    ]))
  })
})
