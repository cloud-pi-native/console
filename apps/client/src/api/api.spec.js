import { vi, describe, it, expect, beforeEach } from 'vitest'
import { apiClient } from './xhr-client.js'
import {
  generateCIFiles,
  getActiveOrganizations,
  getUserProjects,
  getUserProjectById,
  createProject,
  getProjectOwner,
  archiveProject,
  addRepo,
  addUser,
  removeUser,
  getUsers,
  getAllUsers,
  updateUser,
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

vi.spyOn(apiClient, 'get')
vi.spyOn(apiClient, 'post')
vi.spyOn(apiClient, 'put')
vi.spyOn(apiClient, 'patch')
vi.spyOn(apiClient, 'delete')

describe('API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  describe('Projects', () => {
    // CIFiles
    it('Should generate CI files', async () => {
      apiClient.post.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await generateCIFiles({})

      expect(apiClient.post).toHaveBeenCalled()
      expect(apiClient.post).toHaveBeenCalledTimes(1)
      expect(apiClient.post.mock.calls[0][0]).toBe('/ci-files')
    })

    // Project
    it('Should get projects', async () => {
      apiClient.get.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await getUserProjects()

      expect(apiClient.get).toHaveBeenCalled()
      expect(apiClient.get).toHaveBeenCalledTimes(1)
      expect(apiClient.get.mock.calls[0][0]).toBe('/projects')
    })

    it('Should get a project', async () => {
      const projectId = 'thisIsAnId'
      apiClient.get.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await getUserProjectById(projectId)

      expect(apiClient.get).toHaveBeenCalled()
      expect(apiClient.get).toHaveBeenCalledTimes(1)
      expect(apiClient.get.mock.calls[0][0]).toBe(`/projects/${projectId}`)
    })

    it('Should create a project', async () => {
      apiClient.post.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await createProject({})

      expect(apiClient.post).toHaveBeenCalled()
      expect(apiClient.post).toHaveBeenCalledTimes(1)
      expect(apiClient.post.mock.calls[0][0]).toBe('/projects')
    })

    it('Should get project owner', async () => {
      const projectId = 'thisIsAnId'
      apiClient.get.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await getProjectOwner(projectId)

      expect(apiClient.get).toHaveBeenCalled()
      expect(apiClient.get).toHaveBeenCalledTimes(1)
      expect(apiClient.get.mock.calls[0][0]).toBe(`/projects/${projectId}/owner`)
    })

    it('Should archive a project', async () => {
      const projectId = 'thisIsAnId'
      apiClient.delete.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await archiveProject(projectId)

      expect(apiClient.delete).toHaveBeenCalled()
      expect(apiClient.delete).toHaveBeenCalledTimes(1)
      expect(apiClient.delete.mock.calls[0][0]).toBe(`/projects/${projectId}`)
    })

    // Repositories
    it('Should add a repo', async () => {
      const projectId = 'thisIsAnId'
      apiClient.post.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await addRepo(projectId, {})

      expect(apiClient.post).toHaveBeenCalled()
      expect(apiClient.post).toHaveBeenCalledTimes(1)
      expect(apiClient.post.mock.calls[0][0]).toBe(`/projects/${projectId}/repositories`)
    })

    it('Should get repos in project', async () => {
      const projectId = 'thisIsAnId'
      apiClient.get.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await getRepos(projectId)

      expect(apiClient.get).toHaveBeenCalled()
      expect(apiClient.get).toHaveBeenCalledTimes(1)
      expect(apiClient.get.mock.calls[0][0]).toBe(`/projects/${projectId}/repositories`)
    })

    it('Should update a repo in project', async () => {
      const projectId = 'thisIsAnId'
      const data = { id: 'thisIsAnId' }
      apiClient.put.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await updateRepo(projectId, data)

      expect(apiClient.put).toHaveBeenCalled()
      expect(apiClient.put).toHaveBeenCalledTimes(1)
      expect(apiClient.put.mock.calls[0][0]).toBe(`/projects/${projectId}/repositories/${data.id}`)
    })

    it('Should update a repo in project', async () => {
      const projectId = 'thisIsAnId'
      const repoId = 'thisIsAnId'
      apiClient.delete.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await deleteRepo(projectId, repoId)

      expect(apiClient.delete).toHaveBeenCalled()
      expect(apiClient.delete).toHaveBeenCalledTimes(1)
      expect(apiClient.delete.mock.calls[0][0]).toBe(`/projects/${projectId}/repositories/${repoId}`)
    })

    // Users
    it('Should add an user in project', async () => {
      const projectId = 'thisIsAnId'
      apiClient.post.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await addUser(projectId, {})

      expect(apiClient.post).toHaveBeenCalled()
      expect(apiClient.post).toHaveBeenCalledTimes(1)
      expect(apiClient.post.mock.calls[0][0]).toBe(`/projects/${projectId}/users`)
    })

    it('Should update an user in project', async () => {
      const projectId = 'thisIsAnId'
      const data = { id: 'thisIsAnId' }
      apiClient.put.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await updateUser(projectId, data)

      expect(apiClient.put).toHaveBeenCalled()
      expect(apiClient.put).toHaveBeenCalledTimes(1)
      expect(apiClient.put.mock.calls[0][0]).toBe(`/projects/${projectId}/users/${data.id}`)
    })

    it('Should get users in project', async () => {
      const projectId = 'thisIsAnId'
      apiClient.get.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await getUsers(projectId)

      expect(apiClient.get).toHaveBeenCalled()
      expect(apiClient.get).toHaveBeenCalledTimes(1)
      expect(apiClient.get.mock.calls[0][0]).toBe(`/projects/${projectId}/users`)
    })

    it('Should remove an user in project', async () => {
      const projectId = 'thisIsAnId'
      const userId = 'anOtherId'
      apiClient.delete.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await removeUser(projectId, userId)

      expect(apiClient.delete).toHaveBeenCalled()
      expect(apiClient.delete).toHaveBeenCalledTimes(1)
      expect(apiClient.delete.mock.calls[0][0]).toBe(`/projects/${projectId}/users/${userId}`)
    })

    // Environments
    it('Should add an environment in project', async () => {
      const projectId = 'thisIsAnId'
      apiClient.post.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await addEnvironment(projectId)

      expect(apiClient.post).toHaveBeenCalled()
      expect(apiClient.post).toHaveBeenCalledTimes(1)
      expect(apiClient.post.mock.calls[0][0]).toBe(`/projects/${projectId}/environments`)
    })

    it('Should delete an environment in project', async () => {
      const projectId = 'thisIsAnId'
      const environmentId = 'thisIsAnId'
      apiClient.delete.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await deleteEnvironment(projectId, environmentId)

      expect(apiClient.delete).toHaveBeenCalled()
      expect(apiClient.delete).toHaveBeenCalledTimes(1)
      expect(apiClient.delete.mock.calls[0][0]).toBe(`/projects/${projectId}/environments/${environmentId}`)
    })

    // Permissions
    it('Should add permission on an environment in project', async () => {
      const projectId = 'thisIsAnId'
      const environmentId = 'thisIsAnId'
      apiClient.post.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await addPermission(projectId, environmentId, {})

      expect(apiClient.post).toHaveBeenCalled()
      expect(apiClient.post).toHaveBeenCalledTimes(1)
      expect(apiClient.post.mock.calls[0][0]).toBe(`/projects/${projectId}/environments/${environmentId}/permissions`)
    })

    it('Should update a permission on an environment in project', async () => {
      const projectId = 'thisIsAnId'
      const environmentId = 'thisIsAnId'
      apiClient.put.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await updatePermission(projectId, environmentId, {})

      expect(apiClient.put).toHaveBeenCalled()
      expect(apiClient.put).toHaveBeenCalledTimes(1)
      expect(apiClient.put.mock.calls[0][0]).toBe(`/projects/${projectId}/environments/${environmentId}/permissions`)
    })

    it('Should get permissions on an environment in project', async () => {
      const projectId = 'thisIsAnId'
      const environmentId = 'thisIsAnId'
      apiClient.get.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await getPermissions(projectId, environmentId)

      expect(apiClient.get).toHaveBeenCalled()
      expect(apiClient.get).toHaveBeenCalledTimes(1)
      expect(apiClient.get.mock.calls[0][0]).toBe(`/projects/${projectId}/environments/${environmentId}/permissions`)
    })

    it('Should delete permission on an environment in project', async () => {
      const projectId = 'thisIsAnId'
      const environmentId = 'thisIsAnId'
      const userId = 'thisIsAnId'
      apiClient.delete.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await deletePermission(projectId, environmentId, userId)

      expect(apiClient.delete).toHaveBeenCalled()
      expect(apiClient.delete).toHaveBeenCalledTimes(1)
      expect(apiClient.delete.mock.calls[0][0]).toBe(`/projects/${projectId}/environments/${environmentId}/permissions/${userId}`)
    })
  })

  describe('Organizations', () => {
    // Organizations
    it('Should get active organizations', async () => {
      apiClient.get.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await getActiveOrganizations()

      expect(apiClient.get).toHaveBeenCalled()
      expect(apiClient.get).toHaveBeenCalledTimes(1)
      expect(apiClient.get.mock.calls[0][0]).toBe('/organizations')
    })
  })

  // Admin
  describe('Admin', () => {
    // Users
    it('Should get all users', async () => {
      apiClient.get.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await getAllUsers()

      expect(apiClient.get).toHaveBeenCalled()
      expect(apiClient.get).toHaveBeenCalledTimes(1)
      expect(apiClient.get.mock.calls[0][0]).toBe('/admin/users')
    })

    // Organizations
    it('Should get all organizations', async () => {
      const data = [
        { id: 'thisIsAnId', label: 'label', name: 'name' },
      ]
      apiClient.get.mockReturnValueOnce(Promise.resolve({ data }))

      const res = await getAllOrganizations()

      expect(res).toBe(data)
      expect(apiClient.get).toHaveBeenCalled()
      expect(apiClient.get).toHaveBeenCalledTimes(1)
      expect(apiClient.get.mock.calls[0][0]).toBe('/admin/organizations')
    })

    it('Should create an organization', async () => {
      const data = { name: 'name', label: 'label', source: 'dso-console' }
      apiClient.post.mockReturnValueOnce(Promise.resolve({ data }))

      const res = await createOrganization(data)

      expect(res).toBe(data)
      expect(apiClient.post).toHaveBeenCalled()
      expect(apiClient.post).toHaveBeenCalledTimes(1)
      expect(apiClient.post.mock.calls[0][0]).toBe('/admin/organizations')
    })

    it('Should update an organization', async () => {
      const data = { active: false, source: 'dso-console' }
      apiClient.put.mockReturnValueOnce(Promise.resolve({ data }))

      const res = await updateOrganization('name', data)

      expect(res).toBe(data)
      expect(apiClient.put).toHaveBeenCalled()
      expect(apiClient.put).toHaveBeenCalledTimes(1)
      expect(apiClient.put.mock.calls[0][0]).toBe('/admin/organizations/name')
    })
  })
})
