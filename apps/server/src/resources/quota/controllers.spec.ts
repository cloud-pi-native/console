import prisma from '../../__mocks__/prisma.js'
import { vi, describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest'
import { getConnection, closeConnections } from '../../connect.js'
import { adminGroupPath } from '@cpn-console/shared'
import { getRandomQuota, getRandomRole, getRandomStage, getRandomUser, repeatFn } from '@cpn-console/test-utils'
import { faker } from '@faker-js/faker'
import { getRequestor, setRequestor } from '../../utils/mocks.js'
import app from '../../app.js'

vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks.js')).mockSessionPlugin)

describe('Admin quota routes', () => {
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
  describe('getQuotaAssociatedEnvironmentsController', () => {
    it('Should retrieve a quota\'s associated environments', async () => {
      const quota = getRandomQuota('myQuota')
      const environment = {
        name: 'env0',
        stage: {
          name: 'stage1',
        },
        project: {
          name: 'project0',
          organization: {
            name: 'mi',
          },
          roles: [
            { ...getRandomRole(getRequestor().id, 'projectId', 'owner'), user: getRequestor() },
          ],
        },
      }

      prisma.quota.findUnique.mockResolvedValue(quota)
      prisma.environment.findMany.mockResolvedValue([environment])

      const response = await app.inject()
        // @ts-ignore
        .get(`/api/v1/quotas/${quota.id}/environments`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual([{
        organization: environment.project.organization.name,
        project: environment.project.name,
        name: environment.name,
        stage: 'stage1',
        owner: getRequestor().email,
      }])
    })
  })

  describe('createQuotaController', () => {
    it('Should create a quota', async () => {
      const quota = getRandomQuota('myQuota')
      // @ts-ignore
      quota.stageIds = [faker.string.uuid(), faker.string.uuid()]
      // @ts-ignore
      delete quota.stages

      prisma.quota.findUnique.mockResolvedValueOnce(null)
      prisma.quota.create.mockResolvedValue(quota)

      const response = await app.inject()
        // @ts-ignore
        .post('/api/v1/quotas')
        .body(quota)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.json()).toEqual(quota)
    })

    it('Should not create a quota if name is already taken', async () => {
      const quota = getRandomQuota('myQuota')
      quota.stageIds = [faker.string.uuid(), faker.string.uuid()]

      prisma.quota.findUnique.mockResolvedValueOnce(quota)

      const response = await app.inject()
        // @ts-ignore
        .post('/api/v1/quotas')
        .body(quota)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(JSON.parse(response.body).error).toEqual('Un quota portant ce nom existe déjà')
    })
  })

  describe('update Quota Controller', () => {
    it('Should update a quota privacy', async () => {
      const quota = getRandomQuota('myQuota')
      quota.stages = [getRandomStage()]

      prisma.quota.findUnique.mockResolvedValueOnce(quota)
      prisma.quota.update.mockResolvedValueOnce(quota)

      const response = await app.inject()
        // @ts-ignore
        .put(`/api/v1/quotas/${quota.id}`)
        .body({ isPrivate: quota.isPrivate })
        .end()

      // @ts-ignore
      quota.stageIds = quota.stages.map(({ id }) => id)
      // @ts-ignore
      delete quota.stages
      expect(response.json()).toEqual(quota)
      expect(response.statusCode).toEqual(200)
    })

    it('Should update stages associations', async () => {
      const quota = getRandomQuota('myQuota')
      const stages = repeatFn(4)(getRandomStage)
      const data = {
        quotaId: quota.id,
        stageIds: stages.map(stage => stage.id),
      }

      prisma.quota.findUnique.mockResolvedValueOnce({ ...quota, stages })

      const response = await app.inject()
        // @ts-ignore
        .put(`/api/v1/quotas/${quota.id}`)
        .body(data)
        .end()

      // @ts-ignore
      delete quota.stages
      expect(response.json()).toEqual({ ...quota, stageIds: data.stageIds })
      expect(response.statusCode).toEqual(200)
    })
  })

  describe('deleteQuotaController', () => {
    it('Should delete a quota', async () => {
      const quota = getRandomQuota('myQuota')

      prisma.quota.findUnique.mockResolvedValue(quota)
      prisma.stage.findUnique.mockResolvedValue({ id: 'stageId', name: 'dev' })
      prisma.environment.findMany.mockResolvedValue([])
      prisma.quota.delete.mockResolvedValueOnce(1)

      const response = await app.inject()
        // @ts-ignore
        .delete(`/api/v1/quotas/${quota.id}`)
        .end()

      expect(response.statusCode).toEqual(204)
    })

    it('Should not delete a quota if environments suscribed it', async () => {
      const quota = getRandomQuota('myQuota')
      const environment = {
        name: 'env0',
        stage: {
          name: 'stage1',
        },
        project: {
          name: 'project0',
          organization: {
            name: 'mi',
          },
          roles: [
            { ...getRandomRole(getRequestor().id, 'projectId', 'owner'), user: getRequestor() },
          ],
        },
      }

      prisma.quota.findUnique.mockResolvedValue(quota)
      prisma.environment.findMany.mockResolvedValue([environment])
      prisma.quota.delete.mockResolvedValueOnce(1)

      const response = await app.inject()
        // @ts-ignore
        .delete(`/api/v1/quotas/${quota.id}`)
        .end()

      expect(JSON.parse(response.body).error).toEqual('Impossible de supprimer le quota, des environnements en activité y ont souscrit')
      expect(response.statusCode).toEqual(400)
    })
  })
})
