import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../api/xhr-client.js'
import { useProjectUserStore } from './project-user.js'

const apiClientPost = vi.spyOn(apiClient, 'post')
const apiClientDelete = vi.spyOn(apiClient, 'delete')

vi.mock('./project.js', async () => ({
  useProjectStore: () => ({
    selectedProject: { id: 'projectId' },
    getUserProjects: vi.fn(),
    updateProjectRoles: vi.fn(),
  }),
}))

vi.mock('./users.js', async () => ({
  useUsersStore: () => ({
    users: {},
    getProjectUsers: vi.fn(),
    addUser: vi.fn(),
  }),
}))

describe('Counter Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('Should add a user to project by api call', async () => {
    apiClientPost.mockReturnValueOnce(Promise.resolve({ data: [{ projectId: 'projectId', role: 'user', id: 'a', user: { id: 'b', email: 'michel@test.com' } }] }))
    const projectUserStore = useProjectUserStore()

    await projectUserStore.addUserToProject('projectId', { email: 'michel@test.com' })

    expect(apiClientPost).toHaveBeenCalledTimes(1)
    expect(apiClientPost.mock.calls[0][0]).toEqual('/projects/projectId/users')
  })

  it('Should remove a user to from project by api call', async () => {
    apiClientDelete.mockReturnValueOnce(Promise.resolve({ data: {} }))
    const projectUserStore = useProjectUserStore()

    await projectUserStore.removeUserFromProject('projectId', 'userId')

    expect(apiClientDelete).toHaveBeenCalledTimes(1)
    expect(apiClientDelete.mock.calls[0][0]).toEqual('/projects/projectId/users/userId')
  })
})
