import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../api/xhr-client.js'
import { useProjectEnvironmentStore } from './project-environment.js'

const apiClientGetQuotas = vi.spyOn(apiClient.Quotas, 'getQuotas')
const apiClientGetStages = vi.spyOn(apiClient.Stages, 'getStages')
const apiClientPost = vi.spyOn(apiClient.Environments, 'createEnvironment')
const apiClientDelete = vi.spyOn(apiClient.Environments, 'deleteEnvironment')

vi.mock('./project.js', async () => ({
  useProjectStore: () => ({
    selectedProject: { id: 'projectId' },
    getUserProjects: vi.fn(),
  }),
}))

describe('Environment Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('Should get environment quotas by api call', async () => {
    apiClientGetQuotas.mockReturnValueOnce(Promise.resolve({ status: 200, body: [] }))
    const projectEnvironmentStore = useProjectEnvironmentStore()

    await projectEnvironmentStore.getQuotas()

    expect(apiClientGetQuotas).toHaveBeenCalledTimes(1)
  })

  it('Should get environment stages by api call', async () => {
    apiClientGetStages.mockReturnValueOnce(Promise.resolve({ status: 200, body: [] }))
    const projectEnvironmentStore = useProjectEnvironmentStore()

    await projectEnvironmentStore.getStages()

    expect(apiClientGetStages).toHaveBeenCalledTimes(1)
  })

  it('Should add a project environment by api call', async () => {
    apiClientPost.mockReturnValueOnce(Promise.resolve({ status: 201, body: {} }))
    const projectEnvironmentStore = useProjectEnvironmentStore()

    await projectEnvironmentStore.addEnvironmentToProject({ name: 'prod', projectId: 'projectId', clusterId: 'clusterId1', quotaStageId: 'quotastage1' })

    expect(apiClientPost).toHaveBeenCalledTimes(1)
  })

  it('Should delete a project environment by api call', async () => {
    apiClientDelete.mockReturnValueOnce(Promise.resolve({ status: 204, body: {} }))
    const projectEnvironmentStore = useProjectEnvironmentStore()

    await projectEnvironmentStore.deleteEnvironment('environmentId')

    expect(apiClientDelete).toHaveBeenCalledTimes(1)
  })
})
