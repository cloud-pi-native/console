import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../api/xhr-client.js'
import { useProjectPermissionStore } from './project-permission.js'

const apiClientPost = vi.spyOn(apiClient.Permissions, 'createPermission')
const apiClientPut = vi.spyOn(apiClient.Permissions, 'updatePermission')
const apiClientDelete = vi.spyOn(apiClient.Permissions, 'deletePermission')

vi.mock('./project.js', async () => ({
  useProjectStore: () => ({
    selectedProject: { id: 'projectId' },
    getUserProjects: vi.fn(),
  }),
}))

describe('Project Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('Should add a project environment by api call', async () => {
    apiClientPost.mockReturnValueOnce(Promise.resolve({ status: 201, body: {} }))
    const projectPermissionStore = useProjectPermissionStore()

    await projectPermissionStore.addPermission('environmentId', {})

    expect(apiClientPost).toHaveBeenCalledTimes(1)
  })

  it('Should add a project environment by api call', async () => {
    apiClientPut.mockReturnValueOnce(Promise.resolve({ status: 200, body: {} }))
    const projectPermissionStore = useProjectPermissionStore()

    await projectPermissionStore.updatePermission('environmentId', {})

    expect(apiClientPut).toHaveBeenCalledTimes(1)
  })

  it('Should delete a project environment by api call', async () => {
    apiClientDelete.mockReturnValueOnce(Promise.resolve({ status: 204, body: {} }))
    const projectPermissionStore = useProjectPermissionStore()

    await projectPermissionStore.deletePermission('environmentId', 'userId')

    expect(apiClientDelete).toHaveBeenCalledTimes(1)
  })
})
