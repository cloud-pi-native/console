import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../api/xhr-client.js'
import { useProjectPermissionStore } from './project-permission.js'

vi.spyOn(apiClient, 'get')
vi.spyOn(apiClient, 'post')
vi.spyOn(apiClient, 'put')
vi.spyOn(apiClient, 'patch')
vi.spyOn(apiClient, 'delete')

vi.mock('./project.js', async () => ({
  useProjectStore: () => ({
    selectedProject: { id: 'projectId' },
    getUserProjects: vi.fn(),
  }),
}))

describe('Counter Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('Should add a project environment by api call', async () => {
    apiClient.post.mockReturnValueOnce(Promise.resolve({ data: {} }))
    const projectPermissionStore = useProjectPermissionStore()

    await projectPermissionStore.addPermission('environmentId', {})

    expect(apiClient.post).toHaveBeenCalledTimes(1)
    expect(apiClient.post.mock.calls[0][0]).toEqual('/projects/projectId/environments/environmentId/permissions')
  })

  it('Should add a project environment by api call', async () => {
    apiClient.put.mockReturnValueOnce(Promise.resolve({ data: {} }))
    const projectPermissionStore = useProjectPermissionStore()

    await projectPermissionStore.updatePermission('environmentId', {})

    expect(apiClient.put).toHaveBeenCalledTimes(1)
    expect(apiClient.put.mock.calls[0][0]).toEqual('/projects/projectId/environments/environmentId/permissions')
  })

  it('Should delete a project environment by api call', async () => {
    apiClient.delete.mockReturnValueOnce(Promise.resolve({ data: {} }))
    const projectPermissionStore = useProjectPermissionStore()

    await projectPermissionStore.deletePermission('environmentId', 'userId')

    expect(apiClient.delete).toHaveBeenCalledTimes(1)
    expect(apiClient.delete.mock.calls[0][0]).toEqual('/projects/projectId/environments/environmentId/permissions/userId')
  })
})
