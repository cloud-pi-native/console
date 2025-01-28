import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PROJECT_PERMS, repositoryContract } from '@cpn-console/shared'
import app from '../../app.js'
import * as utilsController from '../../utils/controller.js'
import { atDates, getProjectMockInfos, getUserMockInfos } from '../../utils/mocks.js'
import { BadRequest400 } from '../../utils/errors.js'
import * as business from './business.js'

vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks.js')).mockSessionPlugin)
const authUserMock = vi.spyOn(utilsController, 'authUser')
const businessCreateMock = vi.spyOn(business, 'createRepository')
const businessUpdateMock = vi.spyOn(business, 'updateRepository')
const businessDeleteMock = vi.spyOn(business, 'deleteRepository')
const businessSyncMock = vi.spyOn(business, 'syncRepository')
const businessGetProjectRepositoriesMock = vi.spyOn(business, 'getProjectRepositories')

describe('repositoryRouter tests', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  const projectId = faker.string.uuid()
  const repositoryId = faker.string.uuid()
  const repositoryData = {
    projectId,
    externalRepoUrl: `${faker.internet.url()}.git`,
    isPrivate: true,
    externalToken: faker.string.alpha(),
    externalUserName: faker.internet.username(),
    isInfra: false,
    internalRepoName: faker.string.alpha({ length: 5, casing: 'lower' }),
  }

  describe('listRepositories', () => {
    it('should return repositories for authorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.LIST_REPOSITORIES })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessGetProjectRepositoriesMock.mockResolvedValueOnce([])

      const response = await app.inject()
        .get(repositoryContract.listRepositories.path)
        .query({ projectId })
        .end()

      expect(businessGetProjectRepositoriesMock).toHaveBeenCalledWith(projectId)
      expect(response.json()).toEqual([])
      expect(response.statusCode).toEqual(200)
    })

    it('should return 403 for unauthorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.REPLAY_HOOKS })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .get(repositoryContract.listRepositories.path)
        .query({ projectId })
        .end()

      expect(response.statusCode).toEqual(403)
    })
  })

  describe('syncRepository', () => {
    it('should synchronize repository for authorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_REPOSITORIES })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessSyncMock.mockResolvedValueOnce(null)

      const response = await app.inject()
        .post(repositoryContract.syncRepository.path.replace(':repositoryId', repositoryId))
        .body({ branchName: 'main', syncAllBranches: false })
        .end()

      expect(response.statusCode).toEqual(204)
      expect(businessSyncMock).toHaveBeenCalledWith({ repositoryId, userId: user.user.id, branchName: 'main', requestId: expect.any(String), syncAllBranches: false })
    })

    it('should return 403 for forbidden sync attempt', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.SEE_SECRETS })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(repositoryContract.syncRepository.path.replace(':repositoryId', repositoryId))
        .body({ branchName: 'main', syncAllBranches: false })
        .end()

      expect(response.statusCode).toEqual(403)
    })

    it('should return 403 for archived project', async () => {
      const projectPerms = getProjectMockInfos({ projectStatus: 'archived' })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(repositoryContract.syncRepository.path.replace(':repositoryId', repositoryId))
        .body({ branchName: 'main', syncAllBranches: false })
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Le projet est archivé' })
    })

    it('should return 404 for non-member', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: 0n })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(repositoryContract.syncRepository.path.replace(':repositoryId', repositoryId))
        .body({ branchName: 'main', syncAllBranches: false })
        .end()

      expect(response.statusCode).toEqual(404)
    })

    it('should pass business error', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_REPOSITORIES })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessSyncMock.mockResolvedValueOnce(new BadRequest400('une erreur'))
      const response = await app.inject()
        .post(repositoryContract.syncRepository.path.replace(':repositoryId', repositoryId))
        .body({ branchName: 'main', syncAllBranches: false })
        .end()

      expect(response.statusCode).toEqual(400)
    })
  })

  describe('createRepository', () => {
    it('should create repository for authorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_REPOSITORIES })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessCreateMock.mockResolvedValueOnce({ id: repositoryId, ...repositoryData, ...atDates })
      const response = await app.inject()
        .post(repositoryContract.createRepository.path)
        .body(repositoryData)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.json()).toMatchObject({ id: repositoryId, ...repositoryData })
    })

    it('should return 403 if project is locked', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_REPOSITORIES, projectLocked: true })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(repositoryContract.createRepository.path)
        .body(repositoryData)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Le projet est verrouillé' })
    })

    it('should return 403 if project is archived', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_REPOSITORIES, projectStatus: 'archived' })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(repositoryContract.createRepository.path)
        .body(repositoryData)
        .end()

      expect(response.json()).toEqual({ message: 'Le projet est archivé' })
      expect(response.statusCode).toEqual(403)
    })

    it('should return 404 for non-member', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: 0n })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(repositoryContract.createRepository.path)
        .body(repositoryData)
        .end()

      expect(response.statusCode).toEqual(404)
    })
    it('should return 403 for insuficient permissions', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_MEMBERS })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(repositoryContract.createRepository.path)
        .body(repositoryData)
        .end()

      expect(response.statusCode).toEqual(403)
    })
    it('should pass business error', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_REPOSITORIES })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessCreateMock.mockResolvedValueOnce(new BadRequest400('une erreur'))
      const response = await app.inject()
        .post(repositoryContract.createRepository.path)
        .body(repositoryData)
        .end()

      expect(response.statusCode).toEqual(400)
    })
  })

  describe('updateRepository', () => {
    const repoUpdateData = { isInfra: true }
    it('should update repository for authorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_REPOSITORIES })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessUpdateMock.mockResolvedValueOnce({ id: repositoryId, ...repositoryData, ...repoUpdateData, ...atDates })
      const response = await app.inject()
        .put(repositoryContract.updateRepository.path.replace(':repositoryId', repositoryId))
        .body(repoUpdateData)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toMatchObject({ id: repositoryId, ...repositoryData, ...repoUpdateData })
    })

    it('should update repository and drop creds if is not private', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_REPOSITORIES })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const repoUpdateData = { isPrivate: false, externalUserName: 'test' }
      businessUpdateMock.mockResolvedValueOnce({ id: repositoryId, ...repositoryData, ...repoUpdateData, ...atDates })
      const response = await app.inject()
        .put(repositoryContract.updateRepository.path.replace(':repositoryId', repositoryId))
        .body(repoUpdateData)
        .end()

      expect(businessUpdateMock).toHaveBeenCalledWith({ data: { isPrivate: false }, repositoryId, requestId: expect.any(String), userId: user.user.id })
      expect(response.json()).toMatchObject({ id: repositoryId, ...repositoryData, ...repoUpdateData })
      expect(response.statusCode).toEqual(200)
    })

    it('should return 403 if project is locked', async () => {
      const projectPerms = getProjectMockInfos({ projectLocked: true })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .put(repositoryContract.updateRepository.path.replace(':repositoryId', repositoryId))
        .body(repoUpdateData)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Le projet est verrouillé' })
    })

    it('should return 403 if not enough permissions', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.LIST_REPOSITORIES })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .put(repositoryContract.updateRepository.path.replace(':repositoryId', repositoryId))
        .body(repoUpdateData)
        .end()

      expect(response.statusCode).toEqual(403)
    })

    it('should return 404 if non-member', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: 0n })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .put(repositoryContract.updateRepository.path.replace(':repositoryId', repositoryId))
        .body(repoUpdateData)
        .end()

      expect(response.statusCode).toEqual(404)
    })

    it('should return 403 if project is archived', async () => {
      const projectPerms = getProjectMockInfos({ projectStatus: 'archived' })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .put(repositoryContract.updateRepository.path.replace(':repositoryId', repositoryId))
        .body(repoUpdateData)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Le projet est archivé' })
    })

    it('should pass business error', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_REPOSITORIES })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessUpdateMock.mockResolvedValueOnce(new BadRequest400('une erreur'))
      const response = await app.inject()
        .put(repositoryContract.updateRepository.path.replace(':repositoryId', repositoryId))
        .body(repoUpdateData)
        .end()

      expect(response.statusCode).toEqual(400)
    })
    // TODO add tests about filtering
  })

  describe('deleteRepository', () => {
    it('should delete repository for authorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_REPOSITORIES })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessDeleteMock.mockResolvedValueOnce(null)
      const response = await app.inject()
        .delete(repositoryContract.deleteRepository.path.replace(':repositoryId', repositoryId))
        .end()

      expect(response.statusCode).toEqual(204)
    })

    it('should return 403 if project is locked', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_REPOSITORIES, projectLocked: true })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .delete(repositoryContract.deleteRepository.path.replace(':repositoryId', repositoryId))
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Le projet est verrouillé' })
    })

    it('should return 403 if project is archived', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_REPOSITORIES, projectStatus: 'archived' })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .delete(repositoryContract.deleteRepository.path.replace(':repositoryId', repositoryId))
        .end()

      expect(response.json()).toEqual({ message: 'Le projet est archivé' })
      expect(response.statusCode).toEqual(403)
    })

    it('should return 404 for non-member', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: 0n })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .delete(repositoryContract.deleteRepository.path.replace(':repositoryId', repositoryId))
        .end()

      expect(response.statusCode).toEqual(404)
    })
    it('should return 403 if not enough privilege', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_MEMBERS })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .delete(repositoryContract.deleteRepository.path.replace(':repositoryId', repositoryId))
        .end()

      expect(response.statusCode).toEqual(403)
    })
    it('should pass business error', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_REPOSITORIES })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessDeleteMock.mockResolvedValueOnce(new BadRequest400('une erreur'))
      const response = await app.inject()
        .delete(repositoryContract.deleteRepository.path.replace(':repositoryId', repositoryId))
        .end()

      expect(response.statusCode).toEqual(400)
    })
  })
})
