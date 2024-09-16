import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../api/xhr-client.js'
import { useProjectMemberStore } from './project-member.js'

const apiClientPost = vi.spyOn(apiClient.ProjectsMembers, 'addMember')
const apiClientDelete = vi.spyOn(apiClient.ProjectsMembers, 'removeMember')

vi.mock('./project.js', async () => ({
  useProjectStore: () => ({
    selectedProject: { id: 'projectId' },
    listProjects: vi.fn(),
  }),
}))

vi.mock('./users.js', async () => ({
  useUsersStore: () => ({
    users: {},
    addUser: vi.fn(),
    addUsersFromMembers: vi.fn(),
  }),
}))

describe('user Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('should add a user to project by api call', async () => {
    apiClientPost.mockReturnValueOnce(Promise.resolve({ status: 201, body: [{ projectId: 'projectId', role: 'user', id: 'a', user: { id: 'b', email: 'michel@test.com' } }] }))
    const projectMemberStore = useProjectMemberStore()

    await projectMemberStore.addMember('projectId', 'michel@test.com')

    expect(apiClientPost).toHaveBeenCalledTimes(1)
  })

  it('should remove a user to from project by api call', async () => {
    apiClientDelete.mockReturnValueOnce(Promise.resolve({ status: 200, body: {} }))
    const projectMemberStore = useProjectMemberStore()

    await projectMemberStore.removeMember('projectId', 'userId')

    expect(apiClientDelete).toHaveBeenCalledTimes(1)
  })
})
