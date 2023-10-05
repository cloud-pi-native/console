import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../api/xhr-client.js'
import { useProjectEnvironmentStore } from './project-environment.js'

const apiClientGet = vi.spyOn(apiClient, 'get')
const apiClientPost = vi.spyOn(apiClient, 'post')
const apiClientDelete = vi.spyOn(apiClient, 'delete')

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

  it('Should get environment quotas by api call', async () => {
    apiClientGet.mockReturnValueOnce(Promise.resolve({ data: [] }))
    const projectEnvironmentStore = useProjectEnvironmentStore()

    await projectEnvironmentStore.getQuotas()

    expect(apiClientGet).toHaveBeenCalledTimes(1)
    expect(apiClientGet.mock.calls[0][0]).toEqual('/projects/environments/quotas')
  })

  it('Should add a project environment by api call', async () => {
    apiClientPost.mockReturnValueOnce(Promise.resolve({ data: {} }))
    const projectEnvironmentStore = useProjectEnvironmentStore()

    await projectEnvironmentStore.addEnvironmentToProject({ name: 'prod', projectId: 'projectId', clustersId: ['clusterId1', 'clusterId2'] })

    expect(apiClientPost).toHaveBeenCalledTimes(1)
    expect(apiClientPost.mock.calls[0][0]).toEqual('/projects/projectId/environments')
  })

  it('Should delete a project environment by api call', async () => {
    apiClientDelete.mockReturnValueOnce(Promise.resolve({ data: {} }))
    const projectEnvironmentStore = useProjectEnvironmentStore()

    await projectEnvironmentStore.deleteEnvironment('environmentId')

    expect(apiClientDelete).toHaveBeenCalledTimes(1)
    expect(apiClientDelete.mock.calls[0][0]).toEqual('/projects/projectId/environments/environmentId')
  })
})
