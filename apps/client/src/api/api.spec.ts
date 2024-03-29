import { vi, describe, it, expect, beforeEach } from 'vitest'
import { apiClient } from './xhr-client.js'
import {
  generateCIFiles,
  getActiveOrganizations,
  addRepo,
  getRepos,
  updateRepo,
  deleteRepo,
  addEnvironment,
  deleteEnvironment,
  addPermission,
  deletePermission,
  updatePermission,
  getPermissions,
  getAllOrganizations,
  createOrganization,
  updateOrganization,
} from './api.js'

const apiClientGet = vi.spyOn(apiClient, 'get')
const apiClientPost = vi.spyOn(apiClient, 'post')
const apiClientPut = vi.spyOn(apiClient, 'put')
const apiClientDelete = vi.spyOn(apiClient, 'delete')

describe('API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  describe('Projects', () => {
    // CIFiles
    it('Should generate CI files', async () => {
      apiClientPost.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await generateCIFiles({})

      expect(apiClientPost).toHaveBeenCalled()
      expect(apiClientPost).toHaveBeenCalledTimes(1)
      expect(apiClientPost.mock.calls[0][0]).toBe('/ci-files')
    })

    // Repositories
    it('Should add a repo', async () => {
      const projectId = 'thisIsAnId'
      apiClientPost.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await addRepo(projectId, {
        projectId,
        internalRepoName: 'internalRepoName',
        externalRepoUrl: 'https://github.com/cloud-pi-native/console.git',
        isInfra: false,
        isPrivate: false,
      })

      expect(apiClientPost).toHaveBeenCalled()
      expect(apiClientPost).toHaveBeenCalledTimes(1)
      expect(apiClientPost.mock.calls[0][0]).toBe(`/projects/${projectId}/repositories`)
    })

    it('Should get repos in project', async () => {
      const projectId = 'thisIsAnId'
      apiClientGet.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await getRepos(projectId)

      expect(apiClientGet).toHaveBeenCalled()
      expect(apiClientGet).toHaveBeenCalledTimes(1)
      expect(apiClientGet.mock.calls[0][0]).toBe(`/projects/${projectId}/repositories`)
    })

    it('Should update a repo in project', async () => {
      const projectId = 'thisIsAnId'
      const data = { id: 'thisIsAnId' }
      apiClientPut.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await updateRepo(projectId, data)

      expect(apiClientPut).toHaveBeenCalled()
      expect(apiClientPut).toHaveBeenCalledTimes(1)
      expect(apiClientPut.mock.calls[0][0]).toBe(`/projects/${projectId}/repositories/${data.id}`)
    })

    it('Should update a repo in project', async () => {
      const projectId = 'thisIsAnId'
      const repoId = 'thisIsAnId'
      apiClientDelete.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await deleteRepo(projectId, repoId)

      expect(apiClient.delete).toHaveBeenCalled()
      expect(apiClient.delete).toHaveBeenCalledTimes(1)
      expect(apiClientDelete.mock.calls[0][0]).toBe(`/projects/${projectId}/repositories/${repoId}`)
    })

    // Environments
    it('Should add an environment in project', async () => {
      const projectId = 'thisIsAnId'
      apiClientPost.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await addEnvironment(projectId, { name: 'prod', projectId, clusterId: 'clusterId', quotaStageId: 'quotaStageId' })

      expect(apiClientPost).toHaveBeenCalled()
      expect(apiClientPost).toHaveBeenCalledTimes(1)
      expect(apiClientPost.mock.calls[0][0]).toBe(`/projects/${projectId}/environments`)
    })

    it('Should delete an environment in project', async () => {
      const projectId = 'thisIsAnId'
      const environmentId = 'thisIsAnId'
      apiClientDelete.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await deleteEnvironment(projectId, environmentId)

      expect(apiClient.delete).toHaveBeenCalled()
      expect(apiClient.delete).toHaveBeenCalledTimes(1)
      expect(apiClientDelete.mock.calls[0][0]).toBe(`/projects/${projectId}/environments/${environmentId}`)
    })

    // Permissions
    it('Should add permission on an environment in project', async () => {
      const projectId = 'thisIsAnId'
      const environmentId = 'thisIsAnId'
      apiClientPost.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await addPermission(projectId, environmentId, { userId: 'userId', level: 0 })

      expect(apiClientPost).toHaveBeenCalled()
      expect(apiClientPost).toHaveBeenCalledTimes(1)
      expect(apiClientPost.mock.calls[0][0]).toBe(`/projects/${projectId}/environments/${environmentId}/permissions`)
    })

    it('Should update a permission on an environment in project', async () => {
      const projectId = 'thisIsAnId'
      const environmentId = 'thisIsAnId'
      apiClientPut.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await updatePermission(projectId, environmentId, {})

      expect(apiClientPut).toHaveBeenCalled()
      expect(apiClientPut).toHaveBeenCalledTimes(1)
      expect(apiClientPut.mock.calls[0][0]).toBe(`/projects/${projectId}/environments/${environmentId}/permissions`)
    })

    it('Should get permissions on an environment in project', async () => {
      const projectId = 'thisIsAnId'
      const environmentId = 'thisIsAnId'
      apiClientGet.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await getPermissions(projectId, environmentId)

      expect(apiClientGet).toHaveBeenCalled()
      expect(apiClientGet).toHaveBeenCalledTimes(1)
      expect(apiClientGet.mock.calls[0][0]).toBe(`/projects/${projectId}/environments/${environmentId}/permissions`)
    })

    it('Should delete permission on an environment in project', async () => {
      const projectId = 'thisIsAnId'
      const environmentId = 'thisIsAnId'
      const userId = 'thisIsAnId'
      apiClientDelete.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await deletePermission(projectId, environmentId, userId)

      expect(apiClient.delete).toHaveBeenCalled()
      expect(apiClient.delete).toHaveBeenCalledTimes(1)
      expect(apiClientDelete.mock.calls[0][0]).toBe(`/projects/${projectId}/environments/${environmentId}/permissions/${userId}`)
    })
  })

  describe('Organizations', () => {
    // Organizations
    it('Should get active organizations', async () => {
      apiClientGet.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await getActiveOrganizations()

      expect(apiClientGet).toHaveBeenCalled()
      expect(apiClientGet).toHaveBeenCalledTimes(1)
      expect(apiClientGet.mock.calls[0][0]).toBe('/organizations')
    })
  })

  // Admin
  describe('Admin', () => {
    // Organizations
    it('Should get all organizations', async () => {
      const data = [
        { id: 'thisIsAnId', label: 'label', name: 'name' },
      ]
      apiClientGet.mockReturnValueOnce(Promise.resolve({ data }))

      const res = await getAllOrganizations()

      expect(res).toBe(data)
      expect(apiClientGet).toHaveBeenCalled()
      expect(apiClientGet).toHaveBeenCalledTimes(1)
      expect(apiClientGet.mock.calls[0][0]).toBe('/admin/organizations')
    })

    it('Should create an organization', async () => {
      const data = { name: 'name', label: 'label', source: 'dso-console' }
      apiClientPost.mockReturnValueOnce(Promise.resolve({ data }))

      const res = await createOrganization(data)

      expect(res).toBe(data)
      expect(apiClientPost).toHaveBeenCalled()
      expect(apiClientPost).toHaveBeenCalledTimes(1)
      expect(apiClientPost.mock.calls[0][0]).toBe('/admin/organizations')
    })

    it('Should update an organization', async () => {
      const data = { active: false, source: 'dso-console', name: 'name', label: 'label' }
      apiClientPut.mockReturnValueOnce(Promise.resolve({ data }))

      const res = await updateOrganization('name', data)

      expect(res).toBe(data)
      expect(apiClientPut).toHaveBeenCalled()
      expect(apiClientPut).toHaveBeenCalledTimes(1)
      expect(apiClientPut.mock.calls[0][0]).toBe('/admin/organizations/name')
    })
  })
})
