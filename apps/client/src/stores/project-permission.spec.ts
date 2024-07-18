import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../api/xhr-client.js'
import { useProjectPermissionStore } from './project-permission.js'
import { createRandomDbSetup } from '@cpn-console/test-utils'

const listEnvironments = vi.spyOn(apiClient.Environments, 'listEnvironments')
const apiClientPut = vi.spyOn(apiClient.Permissions, 'upsertPermission')
const apiClientDelete = vi.spyOn(apiClient.Permissions, 'deletePermission')

const randomDbSetup = createRandomDbSetup({})

vi.mock('./project.js', async () => ({
  useProjectStore: () => ({
    selectedProject: randomDbSetup.project,
  }),
}))

describe('Permission Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('Should add a permission by api call', async () => {
    const projectPermissionStore = useProjectPermissionStore()

    listEnvironments.mockReturnValueOnce(Promise.resolve({ status: 200, body: [] }))
    apiClientPut.mockReturnValueOnce(Promise.resolve({ status: 200, body: {} }))

    await projectPermissionStore.upsertPermission('environmentId', {})

    expect(apiClientPut).toHaveBeenCalledTimes(1)
  })

  it('Should delete a permission by api call', async () => {
    const projectPermissionStore = useProjectPermissionStore()

    listEnvironments.mockReturnValueOnce(Promise.resolve({ status: 200, body: [] }))
    apiClientDelete.mockReturnValueOnce(Promise.resolve({ status: 204, body: {} }))

    await projectPermissionStore.deletePermission('environmentId', 'userId')

    expect(apiClientDelete).toHaveBeenCalledTimes(1)
  })
})
