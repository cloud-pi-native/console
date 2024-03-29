import prisma from '../../../__mocks__/prisma.js'
import app, { getRequestor, setRequestor } from '../../../__mocks__/app.js'
import { vi, describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest'
import { getConnection, closeConnections } from '../../../connect.js'
import { adminGroupPath } from '@cpn-console/shared'
import { getRandomCluster, getRandomRole, getRandomUser } from '@cpn-console/test-utils'

describe('Admin cluster routes', () => {
  beforeAll(async () => {
    await getConnection()
  })

  afterAll(async () => {
    return closeConnections()
  })

  beforeEach(() => {
    const requestor = { ...getRandomUser(), groups: [adminGroupPath] }
    setRequestor(requestor)

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // GET
  describe('getClusterAssociatedEnvironmentsController', () => {
    it('Should retrieve a cluster\'s associated environments', async () => {
      const cluster = getRandomCluster()
      // @ts-ignore
      cluster.environments = [{
        project: {
          name: 'project0',
          organization: {
            name: 'mi',
          },
          roles: [
            { ...getRandomRole(getRequestor().id, 'projectId', 'owner'), user: getRequestor() },
          ],
        },
        name: 'dev-0',
      }]

      prisma.cluster.findUnique.mockResolvedValue(cluster)

      const response = await app.inject()
        // @ts-ignore
        .get(`/api/v1/admin/clusters/${cluster.id}/environments`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual([{
        // @ts-ignore
        organization: cluster.environments[0]?.project?.organization?.name,
        // @ts-ignore
        project: cluster.environments[0]?.project?.name,
        // @ts-ignore
        name: cluster.environments[0]?.name,
        owner: getRequestor().email,
      }])
    })
  })

  describe('deleteClusterController', () => {
    it('Should delete a cluster', async () => {
      const cluster = getRandomCluster()
      // @ts-ignore
      cluster.environments = []

      prisma.cluster.findUnique.mockResolvedValue(cluster)
      prisma.cluster.delete.mockResolvedValueOnce(1)

      const response = await app.inject()
        // @ts-ignore
        .delete(`/api/v1/admin/clusters/${cluster.id}`)
        .end()

      expect(response.statusCode).toEqual(204)
    })

    it('Should not delete a cluster if environments suscribed it', async () => {
      const cluster = getRandomCluster()
      // @ts-ignore
      cluster.environments = [{
        project: {
          name: 'project0',
          organization: {
            name: 'mi',
          },
          roles: [
            { ...getRandomRole(getRequestor().id, 'projectId', 'owner'), user: getRequestor() },
          ],
        },
        name: 'dev-0',
      }]

      prisma.cluster.findUnique.mockResolvedValue(cluster)

      const response = await app.inject()
        // @ts-ignore
        .delete(`/api/v1/admin/clusters/${cluster.id}`)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.json().message).toEqual('Impossible de supprimer le cluster, des environnements en activité y sont déployés')
    })
  })
})
