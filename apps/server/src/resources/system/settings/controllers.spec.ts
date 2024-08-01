import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import type { KeycloakPayload } from 'fastify-keycloak-adapter'
import { getRandomUser } from '@cpn-console/test-utils'
import prisma from '../../../__mocks__/prisma.js'
import { setRequestor } from '../../../utils/mocks.js'
import app from '../../../app.js'
import { getConnection, closeConnections } from '../../../connect.js'

vi.mock('fastify-keycloak-adapter', (await import('../../../utils/mocks.js')).mockSessionPlugin)
vi.mock('@cpn-console/hooks', (await import('../../../utils/mocks.js')).mockHooksPackage)
vi.mock('../../../utils/hook-wrapper.js', (await import('../../../utils/mocks.js')).mockHookWrapper)

describe('System settings routes', () => {
  const requestor = getRandomUser() as KeycloakPayload
  requestor.groups = []
  setRequestor(requestor)

  beforeAll(async () => {
    await getConnection()
  })

  afterAll(async () => {
    return closeConnections()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('listSystemSettingsController', () => {
    it('Should get a list of system settings', async () => {
      const res = {
        key: 'theme',
        value: 'dsfr',
      }
      prisma.systemSetting.findMany.mockResolvedValue([res])

      const response = await app.inject()
        .get(`/api/v1/system/settings`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual([res])
    })

    it('Should get a filtered list of system settings', async () => {
      const res = {
        key: 'maintenance',
        value: 'off',
      }
      prisma.systemSetting.findUniqueOrThrow.mockResolvedValue(res)

      const response = await app.inject()
        .get(`/api/v1/system/settings?key=maintenance`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual([res])
    })
  })

  describe('upsertSystemSettingController', () => {
    it('Should upsert a system setting', async () => {
      const requestor = { ...getRandomUser(), groups: ['/admin'] }
      setRequestor(requestor)

      const res = {
        key: 'theme',
        value: 'dsfr',
      }
      prisma.systemSetting.upsert.mockResolvedValue(res)

      const response = await app.inject()
        .post(`/api/v1/system/settings`)
        .body(res)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.json()).toEqual(res)
    })

    it('Should not upsert a system setting if not admin', async () => {
      const requestor = { ...getRandomUser(), groups: [] }
      setRequestor(requestor)

      const response = await app.inject()
        .post(`/api/v1/system/settings`)
        .body({
          key: 'theme',
          value: 'dsfr',
        })
        .end()

      expect(JSON.parse(response.body).error).toEqual('Vous n\'avez pas les droits administrateur')
      expect(response.statusCode).toEqual(403)
    })
  })
})
