import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createRandomDbSetup } from '@cpn-console/test-utils'
import { apiClient } from '../api/xhr-client.js'
import { useProjectEnvironmentStore } from './project-environment.js'

const listEnvironments = vi.spyOn(apiClient.Environments, 'listEnvironments')
const apiClientPost = vi.spyOn(apiClient.Environments, 'createEnvironment')
const apiClientDelete = vi.spyOn(apiClient.Environments, 'deleteEnvironment')

vi.mock('./project.js', async () => ({
  useProjectStore: () => ({
    selectedProject: createRandomDbSetup({}).project,
    listProjects: vi.fn(),
  }),
}))

describe('environment Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('should add a project environment by api call', async () => {
    const projectEnvironmentStore = useProjectEnvironmentStore()

    apiClientPost.mockReturnValueOnce(Promise.resolve({ status: 201, body: {} }))
    listEnvironments.mockReturnValueOnce(Promise.resolve({ status: 200, body: [] }))

    await projectEnvironmentStore.addEnvironmentToProject({ name: 'prod', projectId: 'projectId', clusterId: 'clusterId1', quotaId: 'quota1', stageId: 'stage1' })

    expect(apiClientPost).toHaveBeenCalledTimes(1)
  })

  it('should delete a project environment by api call', async () => {
    const projectEnvironmentStore = useProjectEnvironmentStore()

    apiClientDelete.mockReturnValueOnce(Promise.resolve({ status: 204, body: {} }))
    listEnvironments.mockReturnValueOnce(Promise.resolve({ status: 200, body: [] }))

    await projectEnvironmentStore.deleteEnvironment('environmentId')

    expect(apiClientDelete).toHaveBeenCalledTimes(1)
  })
})
