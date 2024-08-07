import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { createRandomDbSetup } from '@cpn-console/test-utils'
import { apiClient } from '../api/xhr-client.js'
import { useProjectRepositoryStore } from './project-repository.js'

const listRepositories = vi.spyOn(apiClient.Repositories, 'listRepositories')
const apiClientPost = vi.spyOn(apiClient.Repositories, 'createRepository')
const apiClientDelete = vi.spyOn(apiClient.Repositories, 'deleteRepository')

vi.mock('./project.js', async () => ({
  useProjectStore: () => ({
    selectedProject: createRandomDbSetup({}).project,
  }),
}))

describe('Repository Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('Should add a project repository by api call', async () => {
    const projectRepositoryStore = useProjectRepositoryStore()

    listRepositories.mockReturnValueOnce(Promise.resolve({ status: 200, body: [] }))
    apiClientPost.mockReturnValueOnce(Promise.resolve({ status: 201, body: {} }))

    const repo = {
      projectId: 'projectId',
      internalRepoName: 'internalRepoName',
      externalRepoUrl: 'https://github.com/cloud-pi-native/console.git',
      isPrivate: false,
      isInfra: false,
    }
    await projectRepositoryStore.addRepoToProject(repo)

    expect(apiClientPost).toHaveBeenCalledTimes(1)
  })

  it('Should delete a project repository by api call', async () => {
    const projectRepositoryStore = useProjectRepositoryStore()

    listRepositories.mockReturnValueOnce(Promise.resolve({ status: 200, body: [] }))
    apiClientDelete.mockReturnValueOnce(Promise.resolve({ status: 204, body: {} }))

    await projectRepositoryStore.deleteRepo('repositoryId')

    expect(apiClientDelete).toHaveBeenCalledTimes(1)
  })
})
