import prisma from '../../../__mocks__/prisma.js'
import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { getRandomUser } from '@cpn-console/test-utils'
import { getConnection, closeConnections } from '../../../connect.js'
import { adminGroupPath, systemPluginContract } from '@cpn-console/shared'
import { setRequestor } from '../../../utils/mocks.js'
import app from '../../../app.js'

vi.mock('fastify-keycloak-adapter', (await import('../../../utils/mocks.js')).mockSessionPlugin)

describe('System config routes', () => {
  const requestor = { ...getRandomUser(), groups: [] as string[] }
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

  // GET
  describe('systemPluginContract', () => {
    it('Should retrieve global config of plugins', async () => {
      prisma.adminPlugin.findMany.mockResolvedValueOnce([])
      requestor.groups = [adminGroupPath]
      setRequestor(requestor)

      const response = await app.inject()
        .get(systemPluginContract.getPluginsConfig.path)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toMatchObject([])
    })

    it('Should not retrieve global config of plugins', async () => {
      prisma.adminPlugin.findMany.mockResolvedValueOnce([])
      requestor.groups = []

      const response = await app.inject()
        .get(systemPluginContract.getPluginsConfig.path)
        .end()

      expect(response.statusCode).toEqual(403)
    })

    it('Should update config of plugins', async () => {
      requestor.groups = [adminGroupPath]
      setRequestor(requestor)

      const response = await app.inject()
        .post(systemPluginContract.updatePluginsConfig.path)
        .body({ argocd: { url: 'dhjvf' } }) // no manifest to validate it
        .end()

      expect(response.statusCode).toEqual(204)
      expect(response.body).toBe('')
    })

    it('Should not update config of plugins', async () => {
      requestor.groups = []

      const response = await app.inject()
        .post(systemPluginContract.updatePluginsConfig.path)
        .body({ argocd: { url: 'dhjvf' } }) // no manifest to validate it
        .end()

      expect(response.statusCode).toEqual(403)
    })
  })
})
