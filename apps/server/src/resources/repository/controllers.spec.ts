import prisma from '../../__mocks__/prisma.js'
import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { createRandomDbSetup, getRandomLog, getRandomRepo, getRandomRole, getRandomUser } from '@cpn-console/test-utils'
import { getConnection, closeConnections } from '../../connect.js'
import { projectIsLockedInfo } from '@cpn-console/shared'
import { getRequestor, setRequestor } from '../../utils/mocks.js'
import app from '../../app.js'

vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks.js')).mockSessionPlugin)
vi.mock('../../utils/hook-wrapper.js', (await import('../../utils/mocks.js')).mockHookWrapper)

describe('Repository routes', () => {
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

  // GET
  describe('getProjectRepositoriesController', () => {
    it('Should get repositories of a project', async () => {
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id)]

      prisma.project.findUnique.mockResolvedValue(projectInfos)

      const response = await app.inject()
        .get(`/api/v1/repositories?projectId=${projectInfos.id}`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      expect(response.json()).toEqual(projectInfos.repositories)
    })
  })

  describe('syncRepositoryController', () => {
    it('Should sync a repository', async () => {
      const projectInfos = createRandomDbSetup({}).project
      const repoToSync = projectInfos.repositories[0]
      const branchName = 'main'
      setRequestor(projectInfos.roles[0].user)

      prisma.repository.findUniqueOrThrow.mockResolvedValue(repoToSync)
      prisma.project.findUniqueOrThrow.mockResolvedValue(projectInfos)

      const response = await app.inject()
        .post(`/api/v1/repositories/${repoToSync.id}/sync`)
        .body({ branchName })
        .end()

      expect(response.statusCode).toEqual(204)
    })

    it('Should not sync a repository if not project member', async () => {
      const projectInfos = createRandomDbSetup({}).project
      const repoToSync = projectInfos.repositories[0]
      const branchName = 'main'

      prisma.repository.findUniqueOrThrow.mockResolvedValue(repoToSync)
      prisma.project.findUniqueOrThrow.mockResolvedValue(projectInfos)

      const response = await app.inject()
        .post(`/api/v1/repositories/${repoToSync.id}/sync`)
        .body({ branchName })
        .end()

      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).error).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
    })
  })

  // POST
  describe('createRepositoryController', () => {
    it('Should create a repository', async () => {
      const randomDbSetUp = createRandomDbSetup({})
      const projectInfos = randomDbSetUp.project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      const newRepository = getRandomRepo(projectInfos.id)

      prisma.user.findUnique.mockResolvedValue(requestor)
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      randomDbSetUp.stages.forEach(stage => {
        prisma.stage.findUnique.mockResolvedValueOnce(randomDbSetUp.stages?.find(dbSetUpstage => dbSetUpstage?.id === stage?.id))
      })
      prisma.repository.create.mockReturnValue(newRepository)
      prisma.log.create.mockResolvedValue(getRandomLog('Create Repository', getRequestor().id))

      const response = await app.inject()
        .post(`/api/v1/repositories?projectId=${projectInfos.id}`)
        .body(newRepository)
        .end()

      expect(response.json()).toMatchObject(newRepository)
      expect(response.statusCode).toEqual(201)
    })

    it('Should not create a repository if project locked', async () => {
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.locked = true

      prisma.user.findUnique.mockResolvedValue(requestor)
      prisma.project.findUnique.mockResolvedValue(projectInfos)

      const response = await app.inject()
        .post(`/api/v1/repositories?projectId=${projectInfos.id}`)
        .body(getRandomRepo(projectInfos.id))
        .end()

      expect(JSON.parse(response.body).error).toEqual(projectIsLockedInfo)
      expect(response.statusCode).toEqual(403)
    })

    it('Should not create a repository with bad internalRepoName', async () => {
      const projectInfos = createRandomDbSetup({}).project
      const newRepository = getRandomRepo(projectInfos.id)
      newRepository.internalRepoName = '^%!!dhrez'

      const response = await app.inject()
        .post(`/api/v1/repositories?projectId=${projectInfos.id}`)
        .body(newRepository)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(JSON.parse(response.body).bodyErrors.issues[0].message).toEqual('failed regex test')
    })
  })

  // PUT
  describe('updateRepositoryController', () => {
    it('Should update a repository', async () => {
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      const repoToUpdate = projectInfos.repositories[0]
      const updatedKeys = {
        externalRepoUrl: 'https://coucou.git',
        isPrivate: true,
        externalToken: 'new',
        externalUserName: 'new',
      }
      const repoUpdated = repoToUpdate
      repoUpdated.externalRepoUrl = updatedKeys.externalRepoUrl
      repoUpdated.isPrivate = updatedKeys.isPrivate
      repoUpdated.externalToken = updatedKeys.externalToken
      repoUpdated.externalUserName = updatedKeys.externalUserName

      prisma.repository.findUniqueOrThrow.mockResolvedValue(repoToUpdate)
      prisma.project.findUniqueOrThrow.mockResolvedValue(projectInfos)
      prisma.project.update.mockResolvedValue(projectInfos)
      prisma.repository.update.mockResolvedValue(repoUpdated)
      prisma.log.create.mockResolvedValue(getRandomLog('Update Repository', getRequestor().id))
      prisma.environment.findMany.mockResolvedValue([])
      prisma.repository.findMany.mockResolvedValue(projectInfos.repositories)

      const response = await app.inject()
        .put(`/api/v1/repositories/${repoToUpdate.id}`)
        .body(updatedKeys)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeDefined()
      expect(JSON.parse(response.body)).toEqual(repoUpdated)
    })

    it('Should not update a repository if invalid keys', async () => {
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      const repoToUpdate = projectInfos.repositories[0]
      const updatedKeys = {
        isPrivate: true,
        externalRepoUrl: 'https://coucou.git',
        externalToken: undefined,
      }

      prisma.repository.findUniqueOrThrow.mockResolvedValue(repoToUpdate)
      prisma.project.findUniqueOrThrow.mockResolvedValue(projectInfos)

      const response = await app.inject()
        .put(`/api/v1/repositories/${repoToUpdate.id}`)
        .body(updatedKeys)
        .end()

      expect(response.statusCode).toEqual(400)

      expect(JSON.parse(response.body).error).toEqual('Le token est requis')
    })

    it('Should not update a repository if project locked', async () => {
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.locked = true
      const repoToUpdate = projectInfos.repositories[0]
      const updatedKeys = {
        isPrivate: false,
      }
      prisma.repository.findUniqueOrThrow.mockResolvedValue(repoToUpdate)
      prisma.project.findUniqueOrThrow.mockResolvedValue(projectInfos)

      const response = await app.inject()
        .put(`/api/v1/repositories/${repoToUpdate.id}`)
        .body(updatedKeys)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).error).toEqual(projectIsLockedInfo)
    })
  })

  // DELETE
  describe('deleteRepositoryController', () => {
    it('Should delete a repository', async () => {
      const randomDbSetUp = createRandomDbSetup({})
      const projectInfos = randomDbSetUp.project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      const repoToDelete = projectInfos.repositories[0]

      prisma.repository.findUniqueOrThrow.mockResolvedValue(repoToDelete)
      prisma.project.findUniqueOrThrow.mockResolvedValue(projectInfos)
      prisma.project.update.mockResolvedValue(projectInfos)
      randomDbSetUp.stages.forEach(stage => {
        prisma.stage.findUnique.mockResolvedValueOnce(randomDbSetUp.stages?.find(dbSetUpstage => dbSetUpstage?.id === stage?.id))
      })
      prisma.repository.findUnique.mockResolvedValue(repoToDelete)
      prisma.repository.update.mockResolvedValue(repoToDelete)
      prisma.log.create.mockResolvedValue(getRandomLog('Delete Repository', getRequestor().id))
      prisma.repository.delete.mockResolvedValue(repoToDelete)
      prisma.environment.findMany.mockResolvedValue([])
      prisma.repository.findMany.mockResolvedValue([])

      const response = await app.inject()
        .delete(`/api/v1/repositories/${repoToDelete.id}`)
        .end()

      expect(response.statusCode).toEqual(204)
    })

    it('Should not delete a repository if not owner', async () => {
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'user')]
      const repoToDelete = projectInfos.repositories[0]

      prisma.repository.findUniqueOrThrow.mockResolvedValue(repoToDelete)
      prisma.project.findUniqueOrThrow.mockResolvedValue(projectInfos)

      const response = await app.inject()
        .delete(`/api/v1/repositories/${repoToDelete.id}`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).error).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
    })

    it('Should not delete a repository if project locked', async () => {
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      const repoToDelete = projectInfos.repositories[0]
      projectInfos.locked = true

      prisma.repository.findUniqueOrThrow.mockResolvedValue(repoToDelete)
      prisma.project.findUniqueOrThrow.mockResolvedValue(projectInfos)

      const response = await app.inject()
        .delete(`/api/v1/repositories/${repoToDelete.id}`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).error).toEqual(projectIsLockedInfo)
    })
  })
})
