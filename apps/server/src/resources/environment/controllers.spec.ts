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
      const stage = randomDbSetUp.stages[0]
      const quota = randomDbSetUp.quotas.find(quota => quota.stageIds.includes(stage.id))

      const envToAdd = getRandomEnv('int0', projectInfos.id, stage.id, quota.id, projectInfos?.clusters[0]?.id)
      const envInfos = { ...envToAdd, project: projectInfos }
      const log = getRandomLog('Create Environment', requestor.id)
      projectInfos.environments?.forEach(environment => {
        environment.cluster = {
          label: projectInfos.clusters[0].label,
        }
      })

      prisma.user.findUnique.mockResolvedValueOnce(getRequestor())
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.cluster.findMany.mockResolvedValue(projectInfos?.clusters)
      prisma.quota.findUnique.mockResolvedValue({ ...quota, stages: randomDbSetUp.stages })
      prisma.stage.findUnique.mockResolvedValue({ ...stage, quotas: randomDbSetUp.quotas })
      prisma.project.update.mockResolvedValue(projectInfos)
      prisma.environment.create.mockReturnValue(envInfos)
      prisma.cluster.findUnique.mockResolvedValue(projectInfos?.clusters[0])
      prisma.environment.findMany.mockResolvedValue(projectInfos.environments)
      prisma.log.create.mockResolvedValueOnce(log)
      prisma.environment.update.mockReturnValue([envInfos])
      prisma.repository.findMany.mockReturnValue(projectInfos.repositories)

      const response = await app.inject()
        .post('/api/v1/environments')
        .body(envToAdd)
        .end()

      expect(response.json()).toMatchObject(envToAdd)
      expect(response.statusCode).toEqual(201)
    })

    it('Should not create an environment if not project member', async () => {
      const randomDbSetUp = createRandomDbSetup({})
      const projectInfos = randomDbSetUp.project
      const stage = randomDbSetUp.stages[0]
      const quota = randomDbSetUp.quotas[0]
      const envToAdd = getRandomEnv('recette', projectInfos.id, stage.id, quota.id)

      prisma.user.findUnique.mockResolvedValueOnce(getRequestor())
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.cluster.findMany.mockResolvedValue(projectInfos?.clusters)
      prisma.quota.findUnique.mockResolvedValue(quota)
      prisma.stage.findUnique.mockResolvedValue(stage)

      const response = await app.inject()
        .post('/api/v1/environments')
        .body(envToAdd)
        .end()

      expect(JSON.parse(response.body).error).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
      expect(response.statusCode).toEqual(403)
    })

    it('Should not create an environment if name is already present', async () => {
      const randomDbSetUp = createRandomDbSetup({})
      const projectInfos = randomDbSetUp.project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      projectInfos.environments[0].name = 'recette'
      const stage = randomDbSetUp.stages[0]
      const quota = randomDbSetUp.quotas[0]
      const envToAdd = getRandomEnv('recette', projectInfos.id, stage.id, quota.id, projectInfos.clusters[0]?.id)

      prisma.user.findUnique.mockResolvedValueOnce(getRequestor())
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.cluster.findMany.mockResolvedValue(projectInfos.clusters)
      prisma.quota.findUnique.mockResolvedValue(quota)
      prisma.stage.findUnique.mockResolvedValue(stage)

      const response = await app.inject()
        .post('/api/v1/environments')
        .body(envToAdd)
        .end()

      expect(JSON.parse(response.body).error).toEqual('Un environnement avec le même nom et déployé sur le même cluster existe déjà pour ce projet.')
      expect(response.statusCode).toEqual(403)
    })

    it('Should not create an environment if no cluster available', async () => {
      const randomDbSetUp = createRandomDbSetup({})
      const projectInfos = randomDbSetUp.project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      const envToAdd = getRandomEnv('develop', projectInfos.id)
      const stage = randomDbSetUp.stages[0]
      const quota = randomDbSetUp.quotas[0]

      prisma.user.findUnique.mockResolvedValueOnce(getRequestor())
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.cluster.findMany.mockResolvedValue([])
      prisma.quota.findUnique.mockResolvedValue(quota)
      prisma.stage.findUnique.mockResolvedValue(stage)

      const response = await app.inject()
        .post('/api/v1/environments')
        .body(envToAdd)
        .end()

      expect(JSON.parse(response.body).error).toEqual('Ce cluster n\'est pas disponible pour cette combinaison projet et stage')
      expect(response.statusCode).toEqual(403)
    })

    it('Should not create an environment if quota and stages are not associated', async () => {
      const randomDbSetUp = createRandomDbSetup({})
      const projectInfos = randomDbSetUp.project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      const stage = randomDbSetUp.stages[0]
      const quota = randomDbSetUp.quotas[0]
      stage.quotas = []
      quota.stages = []
      const envToAdd = getRandomEnv('integ', projectInfos.id, stage.id, quota.id, projectInfos?.clusters[0]?.id)

      prisma.user.findUnique.mockResolvedValueOnce(getRequestor())
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.cluster.findMany.mockResolvedValue(projectInfos.clusters)
      prisma.quota.findUnique.mockResolvedValue(quota)
      prisma.stage.findUnique.mockResolvedValue(stage)

      const response = await app.inject()
        .post('/api/v1/environments')
        .body(envToAdd)
        .end()

      expect(JSON.parse(response.body).error).toEqual('Cette association quota / type d\'environnement n\'est plus disponible.')
      expect(response.statusCode).toEqual(403)
    })

    it('Should not create an environment if project locked', async () => {
      const randomDbSetUp = createRandomDbSetup({})
      const projectInfos = randomDbSetUp.project
      projectInfos.locked = true
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      const quota = randomDbSetUp.quotas[0]
      const stage = randomDbSetUp.stages[0]

      prisma.quota.findUnique.mockResolvedValue(quota)
      prisma.user.findUnique.mockResolvedValueOnce(getRequestor())
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.cluster.findMany.mockResolvedValue(projectInfos.clusters)
      prisma.stage.findUnique.mockResolvedValue(stage)
      prisma.quota.findUnique.mockResolvedValue(quota)

      const response = await app.inject()
        .post('/api/v1/environments')
        .body(getRandomEnv('env', projectInfos.id))
        .end()

      expect(JSON.parse(response.body).error).toEqual(projectIsLockedInfo)
      expect(response.statusCode).toEqual(403)
    })

    it('Should not create an environment with bad name', async () => {
      const projectInfos = createRandomDbSetup({}).project
      const newEnvironment = getRandomEnv('^fpekfk', projectInfos.id)

      const response = await app.inject()
        .post('/api/v1/environments')
        .body(newEnvironment)
        .end()

      expect(JSON.parse(response.body).bodyErrors.issues[0].message).toEqual('Invalid')
      expect(response.statusCode).toEqual(400)
    })
  })

  // PUT
  describe('updateEnvironmentController', () => {
    it('Should update an environment\'s quota', async () => {
      const randomDbSetUp = createRandomDbSetup({ envs: ['dev'] })
      const projectInfos = randomDbSetUp.project

      randomDbSetUp.quotas[0].isPrivate = false
      const quota = randomDbSetUp.quotas[0]
      const stage = randomDbSetUp.stages[0]
      quota.stages = randomDbSetUp.stages
      stage.quotas = randomDbSetUp.quotas
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      const envUpdated = getRandomEnv('int0', projectInfos.id, undefined, undefined, projectInfos?.clusters[0]?.id)
      const envInfos = { ...envUpdated, project: projectInfos }
      const log = getRandomLog('Update Environment', requestor.id)

      prisma.user.findUnique.mockResolvedValueOnce(getRequestor())
      prisma.project.findUniqueOrThrow.mockResolvedValue(projectInfos)
      prisma.cluster.findMany.mockResolvedValue(projectInfos?.clusters)
      prisma.quota.findUnique.mockResolvedValue(quota)
      prisma.stage.findUnique.mockResolvedValue(stage)
      prisma.stage.findUnique.mockResolvedValue(randomDbSetUp?.stages[0])
      prisma.environment.update.mockReturnValue(envInfos)
      prisma.environment.findUnique.mockReturnValue(envInfos)
      prisma.cluster.findUnique.mockResolvedValue(projectInfos?.clusters[0])
      prisma.log.create.mockResolvedValueOnce(log)
      prisma.environment.update.mockReturnValue(envInfos)

      const response = await app.inject()
        .put(`/api/v1/environments/${envUpdated.id}`)
        .body(envUpdated)
        .end()

      delete envInfos.cluster
      delete envInfos.permissions

      // oui c'est degueu mais c'est le seul moyen que j'ai trouvé pour simuler la serialization de fastify
      const responseJson = response.json()
      expect(responseJson).toEqual(envInfos)
      expect(response.statusCode).toEqual(200)
    })
  })

  // DELETE
  describe('deleteEnvironmentController', () => {
    it('Should delete an environment', async () => {
      const randomDbSetUp = createRandomDbSetup({ envs: ['dev'] })
      const projectInfos = randomDbSetUp.project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      const log = getRandomLog('Delete Environment', requestor.id)
      const envToDelete = { ...projectInfos.environments[0], project: projectInfos }

      prisma.environment.findUniqueOrThrow.mockResolvedValue(envToDelete)
      prisma.project.findUniqueOrThrow.mockResolvedValue(projectInfos)
      prisma.environment.update.mockReturnValue(envToDelete)
      prisma.project.update.mockResolvedValue(projectInfos)
      prisma.cluster.findUnique.mockResolvedValue(projectInfos?.clusters[0])
      prisma.log.create.mockResolvedValueOnce(log)
      prisma.environment.delete.mockReturnValue(envToDelete)
      prisma.environment.findMany.mockReturnValue([])
      prisma.repository.findMany.mockReturnValue([])

      const response = await app.inject()
        .delete(`/api/v1/environments/${envToDelete.id}`)
        .end()

      expect(response.statusCode).toEqual(204)
    })

    it('Should not delete an environment if not project member', async () => {
      const projectInfos = createRandomDbSetup({ envs: ['dev'] }).project
      const envToDelete = { ...projectInfos.environments[0], project: projectInfos }

      prisma.environment.findUniqueOrThrow.mockResolvedValue(envToDelete)
      prisma.project.findUniqueOrThrow.mockResolvedValue(projectInfos)

      const response = await app.inject()
        .delete(`/api/v1/environments/${envToDelete.id}`)
        .end()

      expect(JSON.parse(response.body).error).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
      expect(response.statusCode).toEqual(403)
    })

    it('Should not delete an environment if not project owner', async () => {
      const projectInfos = createRandomDbSetup({ envs: ['dev'] }).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'user')]
      const envToDelete = { ...projectInfos.environments[0], project: projectInfos }

      prisma.environment.findUniqueOrThrow.mockResolvedValue(envToDelete)
      prisma.project.findUniqueOrThrow.mockResolvedValue(projectInfos)

      const response = await app.inject()
        .delete(`/api/v1/environments/${envToDelete.id}`)
        .end()

      expect(JSON.parse(response.body).error).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
      expect(response.statusCode).toEqual(403)
    })
  })

  it('Should not delete an environment if project locked', async () => {
    const projectInfos = createRandomDbSetup({ envs: ['dev'] }).project
    projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
    const envToDelete = { ...projectInfos.environments[0], project: projectInfos }
    projectInfos.locked = true

    prisma.environment.findUniqueOrThrow.mockResolvedValue(envToDelete)
    prisma.project.findUniqueOrThrow.mockResolvedValue(projectInfos)

    const response = await app.inject()
      .delete(`/api/v1/environments/${envToDelete.id}`)
      .end()

    expect(JSON.parse(response.body).error).toEqual(projectIsLockedInfo)
    expect(response.statusCode).toEqual(403)
  })
})
