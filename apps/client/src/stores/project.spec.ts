import { createRandomDbSetup, getRandomMember, getRandomProject } from '@cpn-console/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../api/xhr-client.js'
import { useProjectStore } from './project.js'

const getProject = vi.spyOn(apiClient.Projects, 'getProject')
const listProjects = vi.spyOn(apiClient.Projects, 'listProjects')
const listEnvironments = vi.spyOn(apiClient.EnvironmentsV2, 'listEnvironmentsV2')
const listRepositories = vi.spyOn(apiClient.RepositoriesV2, 'listRepositoriesV2')
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

  it('stores plain project state, not a command-bearing class', async () => {
    const projectStore = useProjectStore()
    const randomDbSetup = createRandomDbSetup({})
    delete randomDbSetup.project.clusters

    listProjects.mockReturnValueOnce(Promise.resolve({ status: 200, body: [randomDbSetup.project], headers: {} }))
    await projectStore.listProjects()

    const project = projectStore.projects[0]
    expect(project).not.toHaveProperty('Commands')
    expect(project).not.toHaveProperty('Environments')
    expect(project.operationsInProgress).toEqual([])
    expect(project.environments).toEqual([])
    expect(project.repositories).toEqual([])
  })

  it('updates a project through the store and clears the operation flag', async () => {
    const projectStore = useProjectStore()
    const randomDbSetup = createRandomDbSetup({})
    delete randomDbSetup.project.clusters

    listProjects.mockReturnValueOnce(Promise.resolve({ status: 200, body: [randomDbSetup.project], headers: {} }))
    await projectStore.listProjects()

    const updateProject = vi.spyOn(apiClient.Projects, 'updateProject')
    updateProject.mockReturnValueOnce(Promise.resolve({
      status: 200,
      body: { ...randomDbSetup.project, description: 'Nouvelle description' },
      headers: {},
    }))

    const updated = await projectStore.updateProject(randomDbSetup.project.id, { description: 'Nouvelle description' })

    expect(updated.description).toBe('Nouvelle description')
    expect(updated.operationsInProgress).toEqual([])
    expect(projectStore.projectsBySlug[randomDbSetup.project.slug].description).toBe('Nouvelle description')
  })

  it('rejects an unknown project instead of mutating an arbitrary entry', async () => {
    const projectStore = useProjectStore()

    await expect(projectStore.updateProject('unknown-project', { description: 'x' }))
      .rejects.toThrow('Projet introuvable')
  })
})
