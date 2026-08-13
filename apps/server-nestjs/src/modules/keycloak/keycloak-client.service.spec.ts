import type { ConfigType } from '@nestjs/config'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { keycloakConfigFactory } from '../../config/keycloak.config'
import { KeycloakClientService } from './keycloak-client.service'

function makeService(client: Record<string, any>): KeycloakClientService {
  const config = {
    adminClientId: 'admin-cli',
    admin: 'admin',
    adminPassword: 'admin',
  } as unknown as ConfigType<typeof keycloakConfigFactory>
  const service = new KeycloakClientService(config, client as any)
  // Skip onModuleInit auth round-trip.
  service.onModuleInit = vi.fn()
  return service
}

describe('KeycloakClientService.deleteGroup', () => {
  afterEach(() => vi.restoreAllMocks())

  it('deletes children depth-first then the parent group', async () => {
    const del = vi.fn().mockResolvedValue(undefined)
    const listSubGroups = vi.fn()
    const client = {
      groups: {
        del,
        listSubGroups,
      },
    }

    listSubGroups
      .mockResolvedValueOnce([{ id: 'child-a' }, { id: 'child-b' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const service = makeService(client)
    await service.deleteGroup('parent')

    expect(del).toHaveBeenCalledTimes(3)
    expect(del).toHaveBeenNthCalledWith(1, { id: 'child-a' })
    expect(del).toHaveBeenNthCalledWith(2, { id: 'child-b' })
    expect(del).toHaveBeenNthCalledWith(3, { id: 'parent' })
  })

  it('deletes a leaf group without recursing', async () => {
    const del = vi.fn().mockResolvedValue(undefined)
    const client = {
      groups: {
        del,
        listSubGroups: vi.fn().mockResolvedValue([]),
      },
    }

    const service = makeService(client)
    await service.deleteGroup('leaf')

    expect(del).toHaveBeenCalledTimes(1)
    expect(del).toHaveBeenCalledWith({ id: 'leaf' })
  })
})
