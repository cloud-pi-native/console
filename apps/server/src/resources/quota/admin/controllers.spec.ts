import prisma from '../../../__mocks__/prisma.js'
import { vi, describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest'
import { getConnection, closeConnections } from '../../../connect.js'
import { adminGroupPath } from '@cpn-console/shared'
import { getRandomEnv, getRandomQuota, getRandomQuotaStage, getRandomRole, getRandomStage, getRandomUser, repeatFn } from '@cpn-console/test-utils'
import { faker } from '@faker-js/faker'
import { getRequestor, setRequestor } from '../../../utils/mocks.js'
import app from '../../../app.js'

vi.mock('fastify-keycloak-adapter', (await import('../../../utils/mocks.js')).mockSessionPlugin)

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
        project: {

          name: 'project0',
          organization: {
            name: 'mi',
          },
          roles: [
            { ...getRandomRole(getRequestor().id, 'projectId', 'owner'), user: getRequestor() },
          ],
        },
        quotaStage: { stage: { name: 'dev' } },
      }

      prisma.quota.findUnique.mockResolvedValue(quota)
      prisma.environment.findMany.mockResolvedValue([environment])

      const response = await app.inject()
        // @ts-ignore
        .get(`/api/v1/admin/quotas/${quota.id}/environments`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual([{
        organization: environment.project.organization.name,
        project: environment.project.name,
        name: environment.name,
        stage: 'dev',
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
      const quotaStages = quota.stageIds.map(stageId => getRandomQuotaStage(quota.id, stageId))

      prisma.quota.findUnique.mockResolvedValueOnce(null)
      prisma.quota.create.mockResolvedValue(quota)
      prisma.quotaStage.createMany.mockResolvedValue(quotaStages)

      const response = await app.inject()
        // @ts-ignore
        .post('/api/v1/admin/quotas')
        .body(quota)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.json()).toEqual(quota)
    })

    it('Should not create a quota if name is already taken', async () => {
      const quota = getRandomQuota('myQuota')

      prisma.quota.findUnique.mockResolvedValueOnce(quota)

      const response = await app.inject()
        // @ts-ignore
        .post('/api/v1/admin/quotas')
        .body(quota)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(JSON.parse(response.body).error).toEqual('Un quota portant ce nom existe déjà')
    })
  })

  describe('updateQuotaPrivacyController', () => {
    it('Should update a quota privacy', async () => {
      const quota = getRandomQuota('myQuota')

      prisma.quota.update.mockResolvedValueOnce(quota)

      const response = await app.inject()
        // @ts-ignore
        .patch(`/api/v1/admin/quotas/${quota.id}/privacy`)
        .body({ isPrivate: quota.isPrivate })
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual(quota)
    })
  })

  describe('updateQuotaStageController', () => {
    it('Should update a quotaStage association', async () => {
      const quota = getRandomQuota('myQuota')
      const stages = repeatFn(4)(getRandomStage)
      const dbQuotaStage = [...stages.map(stage => getRandomQuotaStage(quota.id, stage.id)).slice(1), getRandomQuotaStage(quota.id, getRandomStage().id)]
      const newQuotaStage = stages.map(stage => getRandomQuotaStage(quota.id, stage.id))
      const data = {
        quotaId: quota.id,
        stageIds: stages.map(stage => stage.id),
      }

      prisma.quota.findUnique.mockResolvedValueOnce({ ...quota, quotaStage: dbQuotaStage })
      prisma.quotaStage.delete.mockResolvedValue(1)
      prisma.quotaStage.createMany.mockResolvedValue(1)
      prisma.quota.findUniqueOrThrow.mockResolvedValueOnce({ ...quota, quotaStage: newQuotaStage })

      const response = await app.inject()
        // @ts-ignore
        .put('/api/v1/admin/quotas/quotastages')
        .body(data)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual(newQuotaStage)
    })

    it('Should not remove a quotaStage association if an environment suscribed it', async () => {
      const quota = getRandomQuota('myQuota')
      const stages = repeatFn(4)(getRandomStage)
      const dbQuotaStage = [...stages.map(stage => getRandomQuotaStage(quota.id, stage.id)), getRandomQuotaStage(quota.id, getRandomStage().id)]
      const data = {
        quotaId: quota.id,
        stageIds: stages.map(stage => stage.id),
      }

      prisma.quota.findUnique.mockResolvedValueOnce({ ...quota, quotaStage: dbQuotaStage })
      prisma.quotaStage.delete.mockRejectedValueOnce({ message: 'Foreign key constraint failed on the field: `Environment_quotaStageId_fkey' })

      const response = await app.inject()
        // @ts-ignore
        .put('/api/v1/admin/quotas/quotastages')
        .body(data)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(JSON.parse(response.body).error).toEqual('L\'association quota / type d\'environnement que vous souhaitez supprimer est actuellement utilisée. Vous pouvez demander aux souscripteurs concernés de changer le quota choisi pour leur environnement.')
    })
  })

  describe('deleteQuotaController', () => {
    it('Should delete a quota', async () => {
      const quota = getRandomQuota('myQuota')
      // @ts-ignore
      quota.quotaStage = [getRandomQuotaStage(quota.id, 'stageId')]

      prisma.quota.findUnique.mockResolvedValue(quota)
      prisma.stage.findUnique.mockResolvedValue({ id: 'stageId', name: 'dev' })
      prisma.environment.findMany.mockResolvedValue([])
      prisma.quota.delete.mockResolvedValueOnce(1)

      const response = await app.inject()
        // @ts-ignore
        .delete(`/api/v1/admin/quotas/${quota.id}`)
        .end()

      expect(response.statusCode).toEqual(204)
    })

    it('Should not delete a quota if environments suscribed it', async () => {
      const quota = getRandomQuota('myQuota')
      const environment = {
        name: 'env0',
        project: {

          name: 'project0',
          organization: {
            name: 'mi',
          },
          roles: [
            { ...getRandomRole(getRequestor().id, 'projectId', 'owner'), user: getRequestor() },
          ],
        },
        quotaStage: { stage: { name: 'stage-name' } },
      }

      prisma.quota.findUnique.mockResolvedValue(quota)
      prisma.environment.findMany.mockResolvedValue([environment])
      prisma.quota.delete.mockResolvedValueOnce(1)

      const response = await app.inject()
        // @ts-ignore
        .delete(`/api/v1/admin/quotas/${quota.id}`)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(JSON.parse(response.body).error).toEqual('Impossible de supprimer le quota, des environnements en activité y ont souscrit')
    })
  })
})
