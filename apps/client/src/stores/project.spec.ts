import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../api/xhr-client.js'
import { useProjectStore } from './project.js'

vi.spyOn(apiClient, 'get')
vi.spyOn(apiClient, 'post')
vi.spyOn(apiClient, 'put')
vi.spyOn(apiClient, 'patch')
vi.spyOn(apiClient, 'delete')

describe('Project Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('Should set working project and its owner', async () => {
    const projectStore = useProjectStore()
    const user = { id: 'userId', firstName: 'Michel' }
    projectStore.projects = [{
      id: 'projectId',
      roles: [{
        role: 'owner',
        user,
      }],
    }]

    expect(projectStore.selectedProject).toBeUndefined()
    expect(projectStore.selectedProjectOwner).toBeUndefined()

    projectStore.setSelectedProject('projectId')

    expect(projectStore.selectedProject).toMatchObject(projectStore.projects[0])
    expect(projectStore.selectedProjectOwner).toMatchObject(user)
  })

  it('Should retrieve user\'s projects by api call', async () => {
    const projectStore = useProjectStore()

    expect(projectStore.projects).toEqual([])

    const projects = [{ id: 'projectId' }, { id: 'anotherProjectId' }]
    apiClient.get.mockReturnValueOnce(Promise.resolve({ data: projects }))

    await projectStore.getUserProjects()

    expect(apiClient.get).toHaveBeenCalledTimes(1)
    expect(apiClient.get.mock.calls[0][0]).toBe('/projects')
    expect(projectStore.projects).toMatchObject(projects)
  })

  it('Should retrieve user\'s projects by api call (with actual working projet)', async () => {
    const projectStore = useProjectStore()
    const user = { id: 'userId', firstName: 'Michel' }
    const project = {
      id: 'projectId',
      roles: [{
        role: 'owner',
        user,
      }],
    }
    projectStore.projects = [project]
    projectStore.selectedProject = project
    projectStore.selectedProjectOwner = user

    const projects = [project, { id: 'anotherProjectId' }]
    apiClient.get.mockReturnValueOnce(Promise.resolve({ data: projects }))

    await projectStore.getUserProjects()

    expect(apiClient.get).toHaveBeenCalledTimes(1)
    expect(apiClient.get.mock.calls[0][0]).toBe('/projects')
    expect(projectStore.projects).toMatchObject(projects)
    expect(projectStore.selectedProject).toMatchObject(project)
  })

  it('Should create a project by api call', async () => {
    const projectStore = useProjectStore()

    expect(projectStore.projects).toEqual([])

    const project = { id: 'projectId' }
    apiClient.post.mockReturnValueOnce(Promise.resolve({ data: project }))
    apiClient.get.mockReturnValueOnce(Promise.resolve({ data: [project] }))

    await projectStore.createProject(project)

    expect(apiClient.post).toHaveBeenCalledTimes(1)
    expect(apiClient.post.mock.calls[0][0]).toBe('/projects')
    expect(apiClient.get).toHaveBeenCalledTimes(1)
    expect(apiClient.get.mock.calls[0][0]).toBe('/projects')
    expect(projectStore.projects).toMatchObject([project])
  })

  it('Should set a project description by api call', async () => {
    const projectStore = useProjectStore()

    expect(projectStore.projects).toEqual([])

    const project = { id: 'projectId', description: 'Application de prise de rendez-vous en préfécture.' }
    apiClient.put.mockReturnValueOnce(Promise.resolve({ data: project }))
    apiClient.get.mockReturnValueOnce(Promise.resolve({ data: [] }))

    await projectStore.updateProject(project.id, { description: project.description })

    expect(apiClient.put).toHaveBeenCalledTimes(1)
    expect(apiClient.put.mock.calls[0][0]).toBe('/projects/projectId')
    expect(apiClient.get).toHaveBeenCalledTimes(1)
    expect(apiClient.get.mock.calls[0][0]).toBe('/projects')
    expect(projectStore.projects).toEqual([])
  })

  it('Should archive a project by api call', async () => {
    const projectStore = useProjectStore()
    const projects = [{ id: 'projectId' }]
    projectStore.projects = projects

    expect(projectStore.projects).toEqual(projects)

    const project = { id: 'projectId' }
    apiClient.delete.mockReturnValueOnce(Promise.resolve({ data: project }))
    apiClient.get.mockReturnValueOnce(Promise.resolve({ data: [] }))

    await projectStore.archiveProject('projectId')

    expect(apiClient.delete).toHaveBeenCalledTimes(1)
    expect(apiClient.delete.mock.calls[0][0]).toBe('/projects/projectId')
    expect(apiClient.get).toHaveBeenCalledTimes(1)
    expect(apiClient.get.mock.calls[0][0]).toBe('/projects')
    expect(projectStore.projects).toEqual([])
  })
})
