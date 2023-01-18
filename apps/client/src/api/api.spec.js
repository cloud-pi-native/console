import { vi, describe, it, expect, beforeEach } from 'vitest'
import { apiClient } from './xhr-client.js'
import {
  getUserProjects,
  getUserProjectById,
  createProject,
  addRepo,
  addUser,
  removeUser,
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
    it('Should create a project', async () => {
      apiClient.post.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await createProject({})

      expect(apiClient.post).toHaveBeenCalled()
      expect(apiClient.post).toHaveBeenCalledTimes(1)
      expect(apiClient.post.mock.calls[0][0]).toBe('/projects')
    })

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

    it('Should add a repo', async () => {
      const projectId = 'thisIsAnId'
      apiClient.post.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await addRepo(projectId, {})

      expect(apiClient.post).toHaveBeenCalled()
      expect(apiClient.post).toHaveBeenCalledTimes(1)
      expect(apiClient.post.mock.calls[0][0]).toBe(`/projects/${projectId}/repositories`)
    })

    it('Should add an user', async () => {
      const projectId = 'thisIsAnId'
      apiClient.post.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await addUser(projectId, {})

      expect(apiClient.post).toHaveBeenCalled()
      expect(apiClient.post).toHaveBeenCalledTimes(1)
      expect(apiClient.post.mock.calls[0][0]).toBe(`/projects/${projectId}/users`)
    })

    it('Should remove an user', async () => {
      const projectId = 'thisIsAnId'
      const userId = 'anOtherId'
      apiClient.delete.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await removeUser(projectId, userId)

      expect(apiClient.delete).toHaveBeenCalled()
      expect(apiClient.delete).toHaveBeenCalledTimes(1)
      expect(apiClient.delete.mock.calls[0][0]).toBe(`/projects/${projectId}/users/${userId}`)
    })
  })
})
