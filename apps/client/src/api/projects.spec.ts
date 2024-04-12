import { vi, describe, it, expect, beforeEach } from 'vitest'
import { apiClient } from './xhr-client.js'
import {
  getUserProjects,
  createProject,
  archiveProject,
  replayHooks,

} from './projects.js'

const apiClientGet = vi.spyOn(apiClient.Projects, 'getProjects')
const apiClientPost = vi.spyOn(apiClient.Projects, 'createProject')
const apiClientPut = vi.spyOn(apiClient.Projects, 'replayHooksForProject')
const apiClientDelete = vi.spyOn(apiClient.Projects, 'archiveProject')

describe('API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  describe('Projects', () => {
    it('Should get projects', async () => {
      apiClientGet.mockReturnValueOnce(Promise.resolve({ status: 200, body: [] }))

      await getUserProjects()

      expect(apiClientGet).toHaveBeenCalledTimes(1)
    })

    it('Should create a project', async () => {
      apiClientPost.mockReturnValueOnce(Promise.resolve({ status: 201, body: { id: 'idTest' } }))

      await createProject({
        organizationId: 'orgId',
        name: 'projectName',
        description: 'description',
      })

      expect(apiClientPost).toHaveBeenCalledTimes(1)
    })

    it('Should replay hooks for a project', async () => {
      const projectId = 'thisIsAnId'
      apiClientPut.mockReturnValueOnce(Promise.resolve({ status: 204 }))

      await replayHooks(projectId)

      expect(apiClientPut).toHaveBeenCalledTimes(1)
    })

    it('Should archive a project', async () => {
      const projectId = 'thisIsAnId'
      apiClientDelete.mockReturnValueOnce(Promise.resolve({ status: 204 }))

      await archiveProject(projectId)

      expect(apiClientDelete).toHaveBeenCalledTimes(1)
    })
  })
})
