import { vi, describe, it, expect, beforeEach } from 'vitest'
import { apiClient } from './xhr-client.js'
import {
  addUserToProject,
  removeUser,
  getAllUsers,
  updateUserProjectRole,
  getProjectUsers,
} from './users.js'

import type { UpdateUserProjectRoleDto } from '@dso-console/shared'

const apiClientGet = vi.spyOn(apiClient, 'get')
const apiClientPost = vi.spyOn(apiClient, 'post')
const apiClientPut = vi.spyOn(apiClient, 'put')
const apiClientDelete = vi.spyOn(apiClient, 'delete')

describe('API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  describe('Projects', () => {
    // Users
    it('Should add an user in project', async () => {
      const projectId = 'thisIsAnId'
      apiClientPost.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await addUserToProject(projectId, { email: 'test@dso.fr' })

      expect(apiClientPost).toHaveBeenCalled()
      expect(apiClientPost).toHaveBeenCalledTimes(1)
      expect(apiClientPost.mock.calls[0][0]).toBe(`/projects/${projectId}/users`)
    })

    it('Should update an user in project', async () => {
      const projectId = 'projectId'
      const userId = 'userId'
      const data: UpdateUserProjectRoleDto = { role: 'owner' }
      apiClientPut.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await updateUserProjectRole(projectId, userId, data)

      expect(apiClientPut).toHaveBeenCalled()
      expect(apiClientPut).toHaveBeenCalledTimes(1)
      expect(apiClientPut.mock.calls[0][0]).toBe(`/projects/${projectId}/users/${userId}`)
    })

    it('Should get users in project', async () => {
      const projectId = 'thisIsAnId'
      apiClientGet.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await getProjectUsers(projectId)

      expect(apiClientGet).toHaveBeenCalled()
      expect(apiClientGet).toHaveBeenCalledTimes(1)
      expect(apiClientGet.mock.calls[0][0]).toBe(`/projects/${projectId}/users`)
    })

    it('Should remove an user in project', async () => {
      const projectId = 'thisIsAnId'
      const userId = 'anOtherId'
      apiClientDelete.mockReturnValueOnce(Promise.resolve({ data: {} }))

      await removeUser(projectId, userId)

      expect(apiClient.delete).toHaveBeenCalled()
      expect(apiClient.delete).toHaveBeenCalledTimes(1)
      expect(apiClientDelete.mock.calls[0][0]).toBe(`/projects/${projectId}/users/${userId}`)
    })

    // Admin
    describe('Admin', () => {
      // Users
      it('Should get all users', async () => {
        apiClientGet.mockReturnValueOnce(Promise.resolve({ data: {} }))

        await getAllUsers()

        expect(apiClientGet).toHaveBeenCalled()
        expect(apiClientGet).toHaveBeenCalledTimes(1)
        expect(apiClientGet.mock.calls[0][0]).toBe('/admin/users')
      })
    })
  })
})
