import { adminGroupPath } from '@cpn-console/shared'
import { getRandomCluster, getRandomRole, getRandomUser, getRandomStage, repeatFn, getRandomProject } from '@cpn-console/test-utils'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import prisma from '../../__mocks__/prisma.js'
import app from '../../app.js'
import { closeConnections, getConnection } from '../../connect.js'
import { getRequestor, setRequestor } from '../../utils/mocks.js'

vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks.js')).mockSessionPlugin)
vi.mock('../../utils/hook-wrapper.js', (await import('../../utils/mocks.js')).mockHookWrapper)

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
  describe('getClusterDetails', () => {
    it('Should retrieve a cluster\'s details', async () => {
      const cluster = getRandomCluster({})
      const projects = repeatFn(3)(getRandomProject)
      const stages = repeatFn(3)(getRandomStage)

      prisma.cluster.findUniqueOrThrow.mockResolvedValue({ ...cluster, projects, stages })

      const response = await app.inject()
        .get(`/api/v1/clusters/${cluster.id}`)
        .end()

      expect(response.json()).toEqual({
        ...cluster,
        projectIds: projects.map(({ id }) => id),
        stageIds: stages.map(({ id }) => id),
      })
      expect(response.statusCode).toEqual(200)
    })
  })
  describe('getClusterAssociatedEnvironmentsController', () => {
    it('Should retrieve a cluster\'s associated environments', async () => {
      const cluster = getRandomCluster({})
      const environments = [{
        project: {
          name: 'project0',
          organization: {
            name: 'mi',
          },
          roles: [
            { ...getRandomRole(getRequestor().id, 'projectId', 'owner'), user: getRequestor() },
          ],
        },
        name: 'dev0',
      }]

      prisma.environment.findMany.mockResolvedValue(environments)

      const response = await app.inject()
        .get(`/api/v1/clusters/${cluster.id}/environments`)
        .end()

      expect(response.json()).toEqual([{
        organization: environments[0]?.project?.organization?.name,
        project: environments[0]?.project?.name,
        name: environments[0]?.name,
        owner: getRequestor().email,
      }])
      expect(response.statusCode).toEqual(200)
    })
  })

  describe('updateClusterController', () => {
    it('Should update a cluster', async () => {
      const cluster = getRandomCluster({ privacy: 'dedicated' })
      const updatedCluster = { ...cluster, privacy: 'public' }
      const projects = repeatFn(3)(getRandomProject)
      const stages = [getRandomStage()]

      prisma.cluster.findUnique.mockResolvedValue(cluster)
      prisma.cluster.update.mockResolvedValue(updatedCluster)
      prisma.user.findUnique.mockResolvedValue(getRandomUser())
      prisma.stage.findMany.mockResolvedValue(stages)
      prisma.cluster.findUniqueOrThrow.mockResolvedValue({ ...cluster, projects, stages })
      prisma.log.create.mockResolvedValue({})

      const response = await app.inject()
        // @ts-ignore
        .put(`/api/v1/clusters/${cluster.id}`)
        .body(updatedCluster)
        .end()

      expect(response.json()).toEqual({
        ...cluster,
        projectIds: projects.map(({ id }) => id),
        stageIds: stages.map(({ id }) => id),
      })
      expect(response.statusCode).toEqual(200)
    })
  })

  describe('deleteClusterController', () => {
    it('Should delete a cluster', async () => {
      const cluster = getRandomCluster({})
      const environments = []

      prisma.cluster.findUnique.mockResolvedValue(cluster)
      prisma.environment.findMany.mockResolvedValue(environments)
      prisma.cluster.delete.mockResolvedValueOnce(1)

      const response = await app.inject()
        .delete(`/api/v1/clusters/${cluster.id}`)
        .end()

      expect(response.statusCode).toEqual(204)
    })

    it('Should not delete a cluster if environments suscribed it', async () => {
      const cluster = getRandomCluster({})
      const environments = [{
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

      prisma.environment.findMany.mockResolvedValue(environments)
      prisma.cluster.findUnique.mockResolvedValue(cluster)

      const response = await app.inject()
        .delete(`/api/v1/clusters/${cluster.id}`)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(JSON.parse(response.body).error).toEqual('Impossible de supprimer le cluster, des environnements en activité y sont déployés')
    })
  })
})
