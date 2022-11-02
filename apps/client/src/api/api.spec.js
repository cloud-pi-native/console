import { vi, describe, it, expect, beforeEach } from 'vitest'
import { apiClient } from './xhr-client.js'
import {
  getUserProjects,
  getUserProjectById,
  createProject,
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
    it('Should create a project (POST)', async () => {
      apiClient.post.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await createProject({})

      expect(apiClient.post).toHaveBeenCalled()
      expect(apiClient.post).toHaveBeenCalledTimes(1)
      expect(apiClient.post.mock.calls[0][0]).toBe('/projects')
    })

    it('Should get projects (GET)', async () => {
      apiClient.get.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await getUserProjects()

      expect(apiClient.get).toHaveBeenCalled()
      expect(apiClient.get).toHaveBeenCalledTimes(1)
      expect(apiClient.get.mock.calls[0][0]).toBe('/projects')
    })

    it('Should get a project (GET)', async () => {
      const projectId = 'thisIsAnId'
      apiClient.get.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await getUserProjectById(projectId)

      expect(apiClient.get).toHaveBeenCalled()
      expect(apiClient.get).toHaveBeenCalledTimes(1)
      expect(apiClient.get.mock.calls[0][0]).toBe(`/projects/${projectId}`)
    })
  })
})
