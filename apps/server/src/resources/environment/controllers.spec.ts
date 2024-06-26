import prisma from '../../__mocks__/prisma.js'
import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { createRandomDbSetup, getRandomEnv, getRandomUser, getRandomRole, getRandomLog } from '@cpn-console/test-utils'
import { getConnection, closeConnections } from '../../connect.js'
import { projectIsLockedInfo } from '@cpn-console/shared'
import { getRequestor, setRequestor } from '../../utils/mocks.js'
import app from '../../app.js'

vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks.js')).mockSessionPlugin)
vi.mock('../../utils/hook-wrapper.js', (await import('../../utils/mocks.js')).mockHookWrapper)

describe('Environment routes', () => {
  const requestor = getRandomUser()
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

  // POST
  describe('initializeEnvironmentController', () => {
    it('Should create an environment', async () => {
      const randomDbSetUp = createRandomDbSetup({ envs: ['prod'] })
      const projectInfos = randomDbSetUp.project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      const quotaStage = randomDbSetUp?.stages[0]?.quotaStage[0]
      const quota = randomDbSetUp.quotas.find(quota => quotaStage.quotaId === quota.id)
      const envToAdd = getRandomEnv('int0', projectInfos.id, quotaStage?.id, projectInfos?.clusters[0]?.id)
      const envInfos = { ...envToAdd, project: projectInfos }
      const log = getRandomLog('Create Environment', requestor.id)
      projectInfos.environments?.forEach(environment => {
        environment.quotaStage = { stage: { name: 'dev' } }
        environment.cluster = {
          label: projectInfos.clusters[0].label,
        }
      })

      prisma.user.findUnique.mockResolvedValueOnce(getRequestor())
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.cluster.findMany.mockResolvedValue(projectInfos?.clusters)
      prisma.quotaStage.findUnique.mockResolvedValue(quotaStage)
      prisma.quota.findUnique.mockResolvedValue(quota)
      prisma.stage.findUnique.mockResolvedValue(randomDbSetUp?.stages[0])
      prisma.project.update.mockResolvedValue(projectInfos)
      prisma.environment.create.mockReturnValue(envInfos)
      prisma.cluster.findUnique.mockResolvedValue(projectInfos?.clusters[0])
      prisma.environment.findMany.mockResolvedValue(projectInfos.environments)
      prisma.log.create.mockResolvedValueOnce(log)
      prisma.environment.update.mockReturnValue([envInfos])
      prisma.repository.findMany.mockReturnValue(projectInfos.repositories)

      const response = await app.inject()
        .post(`/api/v1/projects/${projectInfos.id}/environments`)
        .body(envToAdd)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.json()).toBeDefined()
      expect(response.json()).toMatchObject(envToAdd)
    })

    it('Should not create an environment if not project member', async () => {
      const randomDbSetUp = createRandomDbSetup({})
      const projectInfos = randomDbSetUp.project
      const envToAdd = getRandomEnv('recette', projectInfos.id)
      const quotaStage = randomDbSetUp?.stages[0]?.quotaStage[0]
      const quota = randomDbSetUp.quotas.find(quota => quotaStage.quotaId === quota.id)

      prisma.user.findUnique.mockResolvedValueOnce(getRequestor())
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.cluster.findMany.mockResolvedValue(projectInfos?.clusters)
      prisma.quotaStage.findUnique.mockResolvedValue(quotaStage)
      prisma.quota.findUnique.mockResolvedValue(quota)

      const response = await app.inject()
        .post(`/api/v1/projects/${projectInfos.id}/environments`)
        .body(envToAdd)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).error).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
    })

    it('Should not create an environment if name is already present', async () => {
      const randomDbSetUp = createRandomDbSetup({})
      const projectInfos = randomDbSetUp.project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      const envToAdd = projectInfos.environments[0]
      const quotaStage = randomDbSetUp?.stages[0]?.quotaStage[0]
      const quota = randomDbSetUp.quotas.find(quota => quotaStage.quotaId === quota.id)

      prisma.user.findUnique.mockResolvedValueOnce(getRequestor())
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.cluster.findMany.mockResolvedValue(projectInfos.clusters)
      prisma.quotaStage.findUnique.mockResolvedValue(quotaStage)
      prisma.quota.findUnique.mockResolvedValue(quota)

      const response = await app.inject()
        .post(`/api/v1/projects/${projectInfos.id}/environments`)
        .body(envToAdd)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toBeDefined()
      expect(JSON.parse(response.body).error).toEqual('Un environnement avec le même nom et déployé sur le même cluster existe déjà pour ce projet.')
    })

    it('Should not create an environment if no cluster available', async () => {
      const randomDbSetUp = createRandomDbSetup({})
      const projectInfos = randomDbSetUp.project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      const envToAdd = getRandomEnv('develop', projectInfos.id)
      const quotaStage = randomDbSetUp?.stages[0]?.quotaStage[0]
      const quota = randomDbSetUp.quotas.find(quota => quotaStage.quotaId === quota.id)

      prisma.user.findUnique.mockResolvedValueOnce(getRequestor())
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.cluster.findMany.mockResolvedValue(projectInfos.clusters)
      prisma.quotaStage.findUnique.mockResolvedValue(quotaStage)
      prisma.quota.findUnique.mockResolvedValue(quota)

      const response = await app.inject()
        .post(`/api/v1/projects/${projectInfos.id}/environments`)
        .body(envToAdd)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toBeDefined()
      expect(JSON.parse(response.body).error).toEqual('Ce cluster n\'est pas disponible pour cette combinaison projet et stage')
    })

    it('Should not create an environment if quotaStage not active', async () => {
      const randomDbSetUp = createRandomDbSetup({})
      const projectInfos = randomDbSetUp.project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      const quotaStage = randomDbSetUp?.stages[0]?.quotaStage[0]
      quotaStage.status = 'pendingDelete'
      const quota = randomDbSetUp.quotas.find(quota => quotaStage.quotaId === quota.id)
      const envToAdd = getRandomEnv('integ', projectInfos.id, quotaStage?.id, projectInfos?.clusters[0]?.id)

      prisma.user.findUnique.mockResolvedValueOnce(getRequestor())
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.cluster.findMany.mockResolvedValue(projectInfos.clusters)
      prisma.quotaStage.findUnique.mockResolvedValue(quotaStage)
      prisma.quota.findUnique.mockResolvedValue(quota)
      prisma.stage.findUnique.mockResolvedValue(randomDbSetUp?.stages[0])

      const response = await app.inject()
        .post(`/api/v1/projects/${projectInfos.id}/environments`)
        .body(envToAdd)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toBeDefined()
      expect(JSON.parse(response.body).error).toEqual('Cette association quota / type d\'environnement n\'est plus disponible.')
    })

    it('Should not create an environment if project locked', async () => {
      const randomDbSetUp = createRandomDbSetup({})
      const projectInfos = randomDbSetUp.project
      projectInfos.locked = true
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      const quotaStage = randomDbSetUp?.stages[0]?.quotaStage[0]
      const quota = randomDbSetUp.quotas.find(quota => quotaStage.quotaId === quota.id)

      prisma.user.findUnique.mockResolvedValueOnce(getRequestor())
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.cluster.findMany.mockResolvedValue(projectInfos.clusters)
      prisma.quotaStage.findUnique.mockResolvedValue(quotaStage)
      prisma.quota.findUnique.mockResolvedValue(quota)

      const response = await app.inject()
        .post(`/api/v1/projects/${projectInfos.id}/environments`)
        .body(getRandomEnv('env', projectInfos.id))
        .end()

      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).error).toEqual(projectIsLockedInfo)
    })

    it('Should not create an environment with bad name', async () => {
      const projectInfos = createRandomDbSetup({}).project
      const newEnvironment = getRandomEnv('^fpekfk', projectInfos.id)

      const response = await app.inject()
        .post(`/api/v1/projects/${projectInfos.id}/environments`)
        .body(newEnvironment)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(JSON.parse(response.body).bodyErrors.issues[0].message).toEqual('Invalid')
    })
  })

  // PUT
  describe('updateEnvironmentController', () => {
    it('Should update an environment\'s quotas', async () => {
      const randomDbSetUp = createRandomDbSetup({ envs: ['dev'] })
      const projectInfos = randomDbSetUp.project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      const newQuotaStage = randomDbSetUp?.stages[0]?.quotaStage[0]
      const quota = randomDbSetUp.quotas.find(quota => newQuotaStage.quotaId === quota.id)
      const envUpdated = getRandomEnv('int0', projectInfos.id, newQuotaStage?.id, projectInfos?.clusters[0]?.id)
      const envInfos = { ...envUpdated, project: projectInfos }
      const log = getRandomLog('Update Environment', requestor.id)

      prisma.user.findUnique.mockResolvedValueOnce(getRequestor())
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.cluster.findMany.mockResolvedValue(projectInfos?.clusters)
      prisma.quotaStage.findUnique.mockResolvedValue(newQuotaStage)
      prisma.quota.findUnique.mockResolvedValue(quota)
      prisma.stage.findUnique.mockResolvedValue(randomDbSetUp?.stages[0])
      prisma.environment.update.mockReturnValue(envInfos)
      prisma.environment.findUnique.mockReturnValue(envInfos)
      prisma.cluster.findUnique.mockResolvedValue(projectInfos?.clusters[0])
      prisma.log.create.mockResolvedValueOnce(log)
      prisma.environment.update.mockReturnValue(envInfos)

      const response = await app.inject()
        .put(`/api/v1/projects/${projectInfos.id}/environments/${envUpdated.id}`)
        .body(envUpdated)
        .end()

      delete envInfos.project
      delete envInfos.cluster
      delete envInfos.permissions

      // oui c'est degueu mais c'est le seul moyen que j'ai trouvé pour simuler la serialization de fastify
      const responseJson = response.json()
      delete responseJson.project
      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeDefined()
      expect(responseJson).toEqual(envInfos)
    })
  })

  // DELETE
  describe('deleteEnvironmentController', () => {
    it('Should delete an environment', async () => {
      const randomDbSetUp = createRandomDbSetup({ envs: ['dev'] })
      const projectInfos = randomDbSetUp.project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      const log = getRandomLog('Delete Environment', requestor.id)
      const envToDelete = { ...projectInfos.environments[0], project: projectInfos, quotaStage: { stage: { name: 'dev' } } }

      prisma.environment.findUnique.mockResolvedValue(envToDelete)
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.environment.update.mockReturnValue(envToDelete)
      prisma.project.update.mockResolvedValue(projectInfos)
      prisma.cluster.findUnique.mockResolvedValue(projectInfos?.clusters[0])
      prisma.log.create.mockResolvedValueOnce(log)
      prisma.environment.delete.mockReturnValue(envToDelete)
      prisma.environment.findMany.mockReturnValue([])
      prisma.repository.findMany.mockReturnValue([])

      const response = await app.inject()
        .delete(`/api/v1/projects/${projectInfos.id}/environments/${envToDelete.id}`)
        .end()

      expect(response.statusCode).toEqual(204)
    })

    it('Should not delete an environment if not project member', async () => {
      const projectInfos = createRandomDbSetup({ envs: ['dev'] }).project
      const envToDelete = { ...projectInfos.environments[0], project: projectInfos }

      prisma.environment.findUnique.mockResolvedValue(envToDelete)
      prisma.project.findUnique.mockResolvedValue(projectInfos)

      const response = await app.inject()
        .delete(`/api/v1/projects/${projectInfos.id}/environments/${envToDelete.id}`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).error).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
    })

    it('Should not delete an environment if not project owner', async () => {
      const projectInfos = createRandomDbSetup({ envs: ['dev'] }).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'user')]
      const envToDelete = { ...projectInfos.environments[0], project: projectInfos }

      prisma.environment.findUnique.mockResolvedValue(envToDelete)
      prisma.project.findUnique.mockResolvedValue(projectInfos)

      const response = await app.inject()
        .delete(`/api/v1/projects/${projectInfos.id}/environments/${envToDelete.id}`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).error).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
    })
  })

  it('Should not delete an environment if project locked', async () => {
    const projectInfos = createRandomDbSetup({ envs: ['dev'] }).project
    projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
    const envToDelete = { ...projectInfos.environments[0], project: projectInfos }
    projectInfos.locked = true

    prisma.environment.findUnique.mockResolvedValue(envToDelete)
    prisma.project.findUnique.mockResolvedValue(projectInfos)

    const response = await app.inject()
      .delete(`/api/v1/projects/${projectInfos.id}/environments/${envToDelete.id}`)
      .end()

    expect(response.statusCode).toEqual(403)
    expect(JSON.parse(response.body).error).toEqual(projectIsLockedInfo)
  })
})
