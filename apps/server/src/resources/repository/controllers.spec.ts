import prisma from '../../__mocks__/prisma.js'
import app, { getRequestor, setRequestor } from '../../__mocks__/app.js'
import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { createRandomDbSetup, getRandomLog, getRandomRepo, getRandomRole, getRandomUser } from '@dso-console/test-utils'
import { getConnection, closeConnections } from '../../connect.js'
import { projectIsLockedInfo } from '@dso-console/shared'

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
  describe('getRepositoryByIdController', () => {
    it('Should get a repository by its id', async () => {
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id)]
      const repoToGet = projectInfos.repositories[0]

      prisma.project.findUnique.mockResolvedValueOnce(projectInfos)

      const response = await app.inject()
        .get(`/api/v1/projects/${projectInfos.id}/repositories/${repoToGet.id}`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toMatchObject(repoToGet)
    })
  })

  describe('getProjectRepositoriesController', () => {
    it('Should get repositories of a project', async () => {
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id)]

      prisma.project.findUnique.mockResolvedValue(projectInfos)

      const response = await app.inject()
        .get(`/api/v1/projects/${projectInfos.id}/repositories`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      expect(response.json()).toEqual(projectInfos.repositories)
    })
  })

  // POST
  describe('createRepositoryController', () => {
    it('Should create a repository', async () => {
      const randomDbSetUp = createRandomDbSetup({})
      const projectInfos = randomDbSetUp.project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      const newRepository = getRandomRepo(projectInfos.id)

      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.user.findUnique.mockResolvedValue(requestor)
      prisma.project.update.mockResolvedValue(projectInfos)
      randomDbSetUp.stages.forEach(stage => {
        prisma.stage.findUnique.mockResolvedValueOnce(randomDbSetUp.stages?.find(dbSetUpstage => dbSetUpstage?.id === stage?.id))
      })
      prisma.repository.create.mockReturnValue(newRepository)
      prisma.log.create.mockResolvedValue(getRandomLog('Create Repository', getRequestor().id))
      prisma.repository.update.mockResolvedValue(newRepository)
      prisma.environment.findMany.mockResolvedValue([])
      prisma.repository.findMany.mockResolvedValue(projectInfos.repositories)

      const response = await app.inject()
        .post(`/api/v1/projects/${projectInfos.id}/repositories`)
        .body(newRepository)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.json()).toMatchObject(newRepository)
    })

    it('Should not create a repository if project locked', async () => {
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.locked = true

      prisma.project.findUnique.mockResolvedValue(projectInfos)

      const response = await app.inject()
        .post(`/api/v1/projects/${projectInfos.id}/repositories`)
        .body(getRandomRepo(projectInfos.id))
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().message).toEqual(projectIsLockedInfo)
    })

    it('Should not create a repository with bad internalRepoName', async () => {
      const projectInfos = createRandomDbSetup({}).project
      const newRepository = getRandomRepo(projectInfos.id)
      newRepository.internalRepoName = '^%!!dhrez'

      const response = await app.inject()
        .post(`/api/v1/projects/${projectInfos.id}/repositories`)
        .body(newRepository)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.json().message).toEqual('Validation error: failed regex test at "internalRepoName"')
    })
  })

  // PUT
  describe('updateRepositoryController', () => {
    it('Should update a repository', async () => {
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      const repoToUpdate = projectInfos.repositories[0]
      const updatedKeys = {
        externalRepoUrl: 'new',
        isPrivate: true,
        externalToken: 'new',
        externalUserName: 'new',
      }
      const repoUpdated = repoToUpdate
      repoUpdated.externalRepoUrl = updatedKeys.externalRepoUrl
      repoUpdated.isPrivate = updatedKeys.isPrivate
      repoUpdated.externalToken = updatedKeys.externalToken
      repoUpdated.externalUserName = updatedKeys.externalUserName

      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.project.update.mockResolvedValue(projectInfos)
      prisma.repository.update.mockResolvedValue(repoUpdated)
      prisma.log.create.mockResolvedValue(getRandomLog('Update Repository', getRequestor().id))
      prisma.environment.findMany.mockResolvedValue([])
      prisma.repository.findMany.mockResolvedValue(projectInfos.repositories)

      const response = await app.inject()
        .put(`/api/v1/projects/${projectInfos.id}/repositories/${repoToUpdate.id}`)
        .body(updatedKeys)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Dépôt mis à jour avec succès')
    })

    it('Should not update a repository if invalid keys', async () => {
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      const repoToUpdate = projectInfos.repositories[0]
      const updatedKeys = {
        isPrivate: true,
        externalRepoUrl: 'new',
        externalToken: undefined,
      }

      prisma.project.findUnique.mockResolvedValue(projectInfos)

      const response = await app.inject()
        .put(`/api/v1/projects/${projectInfos.id}/repositories/${repoToUpdate.id}`)
        .body(updatedKeys)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.json().message).toEqual('Le token est requis')
    })

    it('Should not update a repository if project locked', async () => {
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.locked = true
      const repoToUpdate = projectInfos.repositories[0]
      const updatedKeys = {
        isPrivate: false,
      }

      prisma.project.findUnique.mockResolvedValue(projectInfos)

      const response = await app.inject()
        .put(`/api/v1/projects/${projectInfos.id}/repositories/${repoToUpdate.id}`)
        .body(updatedKeys)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().message).toEqual(projectIsLockedInfo)
    })
  })

  // DELETE
  describe('deleteRepositoryController', () => {
    it('Should delete a repository', async () => {
      const randomDbSetUp = createRandomDbSetup({})
      const projectInfos = randomDbSetUp.project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      const repoToDelete = projectInfos.repositories[0]

      prisma.project.findUnique.mockResolvedValue(projectInfos)
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
        .delete(`/api/v1/projects/${projectInfos.id}/repositories/${repoToDelete.id}`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Dépôt en cours de suppression')
    })

    it('Should not delete a repository if not owner', async () => {
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'user')]
      const repoToDelete = projectInfos.repositories[0]

      prisma.project.findUnique.mockResolvedValue(projectInfos)

      const response = await app.inject()
        .delete(`/api/v1/projects/${projectInfos.id}/repositories/${repoToDelete.id}`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().message).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
    })
  })
})
