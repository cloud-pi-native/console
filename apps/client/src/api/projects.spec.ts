import { vi, describe, it, expect, beforeEach } from 'vitest'
import { apiClient } from './xhr-client.js'
import {
  getUserProjects,
  createProject,
  archiveProject,
  replayHooks,

} from './projects.js'

const apiClientGet = vi.spyOn(apiClient, 'get')
const apiClientPost = vi.spyOn(apiClient, 'post')
const apiClientPut = vi.spyOn(apiClient, 'put')
const apiClientDelete = vi.spyOn(apiClient, 'delete')

describe('API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  describe('Projects', () => {
    // Project
    it('Should get projects', async () => {
      apiClientGet.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await getUserProjects()

      expect(apiClientGet).toHaveBeenCalled()
      expect(apiClientGet).toHaveBeenCalledTimes(1)
      expect(apiClientGet.mock.calls[0][0]).toBe('/projects')
    })

    it('Should create a project', async () => {
      apiClientPost.mockReturnValueOnce(Promise.resolve({ data: { id: 'idTest' } }))

      await createProject({
        organizationId: 'orgId',
        name: 'projectName',
        description: 'description',
      })

      expect(apiClientPost).toHaveBeenCalled()
      expect(apiClientPost).toHaveBeenCalledTimes(1)
      expect(apiClientPost.mock.calls[0][0]).toBe('/projects')
    })

    it('Should replay hooks for a project', async () => {
      const projectId = 'thisIsAnId'
      apiClientPut.mockReturnValueOnce(Promise.resolve({ data: { id: 'idTest' } }))

      await replayHooks(projectId)

      expect(apiClientPut).toHaveBeenCalled()
      expect(apiClientPut).toHaveBeenCalledTimes(1)
      expect(apiClientPut.mock.calls[0][0]).toBe(`/projects/${projectId}/hooks`)
    })

    it('Should archive a project', async () => {
      const projectId = 'thisIsAnId'
      apiClientDelete.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await archiveProject(projectId)

      expect(apiClient.delete).toHaveBeenCalled()
      expect(apiClient.delete).toHaveBeenCalledTimes(1)
      expect(apiClientDelete.mock.calls[0][0]).toBe(`/projects/${projectId}`)
    })
  })
})
