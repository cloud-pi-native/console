import { vi, describe, it, expect, beforeEach } from 'vitest'
import { apiClient } from './xhr-client.js'
import {
  addUserToProject,
  removeUser,
  getAllUsers,
  updateUserProjectRole,
  getProjectUsers,
} from './users.js'

import type { UpdateUserRoleInProjectBody } from '@cpn-console/shared'

const apiClientGetAdmin = vi.spyOn(apiClient.UsersAdmin, 'getAllUsers')
const apiClientGet = vi.spyOn(apiClient.Users, 'getProjectUsers')
const apiClientPost = vi.spyOn(apiClient.Users, 'createUserRoleInProject')
const apiClientPut = vi.spyOn(apiClient.Users, 'updateUserRoleInProject')
const apiClientDelete = vi.spyOn(apiClient.Users, 'deleteUserRoleInProject')

describe('API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  describe('Projects', () => {
    // Users
    it('Should add an user in project', async () => {
      const projectId = 'thisIsAnId'
      apiClientPost.mockReturnValueOnce(Promise.resolve({ status: 200, body: {} }))

      await addUserToProject(projectId, { email: 'test@dso.fr' })

      expect(apiClientPost).toHaveBeenCalled()
      expect(apiClientPost).toHaveBeenCalledTimes(1)
    })

    it('Should update an user in project', async () => {
      const projectId = 'projectId'
      const userId = 'userId'
      const data: UpdateUserRoleInProjectBody = { role: 'owner' }
      apiClientPut.mockReturnValueOnce(Promise.resolve({ status: 200, body: {} }))

      await updateUserProjectRole(projectId, userId, data)

      expect(apiClientPut).toHaveBeenCalled()
      expect(apiClientPut).toHaveBeenCalledTimes(1)
    })

    it('Should get users in project', async () => {
      const projectId = 'thisIsAnId'
      apiClientGet.mockReturnValueOnce(Promise.resolve({ status: 200, body: {} }))

      await getProjectUsers(projectId)

      expect(apiClientGet).toHaveBeenCalled()
      expect(apiClientGet).toHaveBeenCalledTimes(1)
    })

    it('Should remove an user in project', async () => {
      const projectId = 'thisIsAnId'
      const userId = 'anOtherId'
      apiClientDelete.mockReturnValueOnce(Promise.resolve({ status: 200, body: {} }))

      await removeUser(projectId, userId)

      expect(apiClientDelete).toHaveBeenCalled()
      expect(apiClientDelete).toHaveBeenCalledTimes(1)
    })

    // Admin
    describe('Admin', () => {
      // Users
      it('Should get all users', async () => {
        apiClientGetAdmin.mockReturnValueOnce(Promise.resolve({ status: 200, body: {} }))

        await getAllUsers()

        expect(apiClientGetAdmin).toHaveBeenCalled()
        expect(apiClientGetAdmin).toHaveBeenCalledTimes(1)
      })
    })
  })
})
