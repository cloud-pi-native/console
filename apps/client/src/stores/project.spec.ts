import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createRandomDbSetup, getRandomMember, getRandomProject } from '@cpn-console/test-utils'
import { apiClient } from '../api/xhr-client'
import { useProjectStore } from './project'

const getProject = vi.spyOn(apiClient.Projects, 'getProject')
const listProjects = vi.spyOn(apiClient.Projects, 'listProjects')
const listEnvironments = vi.spyOn(apiClient.Environments, 'listEnvironments')
const listRepositories = vi.spyOn(apiClient.Repositories, 'listRepositories')
const apiClientPost = vi.spyOn(apiClient.Projects, 'createProject')

describe('project Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('should retrieve projects by api call', async () => {
    const projectStore = useProjectStore()
    const randomDbSetup = createRandomDbSetup({})

    expect(projectStore.projects).toEqual([])

    delete randomDbSetup.project.environments
    delete randomDbSetup.project.repositories
    delete randomDbSetup.project.clusters
    const projects = [randomDbSetup.project]

    listProjects.mockReturnValueOnce(Promise.resolve({ status: 200, body: projects, headers: {} }))

    await projectStore.listProjects()

    expect(listProjects).toHaveBeenCalledTimes(1)
    expect(projectStore.projects).toMatchObject(projects)
  })

  it('should retrieve user\'s projects by api call', async () => {
    const projectStore = useProjectStore()
    const randomDbSetup = createRandomDbSetup({})

    expect(projectStore.projects).toEqual([])

    delete randomDbSetup.project.clusters
    const projects = [randomDbSetup.project]

    listProjects.mockReturnValueOnce(Promise.resolve({ status: 200, body: projects, headers: {} }))
    listEnvironments.mockReturnValue(Promise.resolve({ status: 200, body: randomDbSetup.project.environments, headers: {} }))
    listRepositories.mockReturnValue(Promise.resolve({ status: 200, body: randomDbSetup.project.repositories, headers: {} }))

    await projectStore.listMyProjects()

    expect(listProjects).toHaveBeenCalledTimes(1)
  })

  it('should retrieve one project by api call', async () => {
    const projectStore = useProjectStore()
    const randomDbSetup = createRandomDbSetup({})

    expect(projectStore.projects).toEqual([])

    delete randomDbSetup.project.clusters
    const project = randomDbSetup.project

    getProject.mockReturnValueOnce(Promise.resolve({ status: 200, body: project, headers: {} }))
    listEnvironments.mockReturnValue(Promise.resolve({ status: 200, body: randomDbSetup.project.environments, headers: {} }))
    listRepositories.mockReturnValue(Promise.resolve({ status: 200, body: randomDbSetup.project.repositories, headers: {} }))

    await projectStore.getProject('foo')

    expect(getProject).toHaveBeenCalledTimes(1)
  })

  it('should create a project by api call', async () => {
    const projectStore = useProjectStore()
    const randomDbSetup = createRandomDbSetup({})

    expect(projectStore.projects).toEqual([])

    const projects = [randomDbSetup.project]
    const newProject = getRandomProject()
    newProject.members = [getRandomMember(randomDbSetup.users[0].id, 'owner')]

    apiClientPost.mockReturnValueOnce(Promise.resolve({ status: 201, body: newProject, headers: {} }))
    listProjects.mockReturnValueOnce(Promise.resolve({ status: 200, body: [...projects, newProject], headers: {} }))

    await projectStore.createProject(newProject)

    expect(apiClientPost).toHaveBeenCalledTimes(1)
    expect(projectStore.myProjects).toHaveLength(1)
  })
})
