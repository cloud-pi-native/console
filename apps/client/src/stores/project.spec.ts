import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../api/xhr-client.js'
import { useProjectStore } from './project.js'
import { useUsersStore } from './users.js'

const apiClientGet = vi.spyOn(apiClient, 'get')
const apiClientPost = vi.spyOn(apiClient, 'post')
const apiClientPut = vi.spyOn(apiClient, 'put')
const apiClientDelete = vi.spyOn(apiClient, 'delete')

describe('Project Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('Should set working project and its owner', async () => {
    const projectStore = useProjectStore()
    const usersStore = useUsersStore()
    const user = { id: 'userId', firstName: 'Michel' }
    usersStore.addUser(user)
    projectStore.projects = [{
      id: 'projectId',
      roles: [{
        role: 'owner',
        userId: user.id,
        user,
      }],
    }]

    expect(projectStore.selectedProject).toBeUndefined()

    projectStore.setSelectedProject('projectId')

    expect(projectStore.selectedProject).toMatchObject(projectStore.projects[0])
  })

  it('Should retrieve user\'s projects by api call', async () => {
    const projectStore = useProjectStore()

    expect(projectStore.projects).toEqual([])

    const projects = [{ id: 'projectId' }, { id: 'anotherProjectId' }]
    apiClientGet.mockReturnValueOnce(Promise.resolve({ data: projects }))

    await projectStore.getUserProjects()

    expect(apiClientGet).toHaveBeenCalledTimes(1)
    expect(apiClientGet.mock.calls[0][0]).toBe('/projects')
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

    const projects = [project, { id: 'anotherProjectId' }]
    apiClientGet.mockReturnValueOnce(Promise.resolve({ data: projects }))

    await projectStore.getUserProjects()

    expect(apiClientGet).toHaveBeenCalledTimes(1)
    expect(apiClientGet.mock.calls[0][0]).toBe('/projects')
    expect(projectStore.projects).toMatchObject(projects)
    expect(projectStore.selectedProject).toMatchObject(project)
  })

  it('Should create a project by api call', async () => {
    const projectStore = useProjectStore()

    expect(projectStore.projects).toEqual([])

    const project = { id: 'projectId' }
    apiClientPost.mockReturnValueOnce(Promise.resolve({ data: project }))
    apiClientGet.mockReturnValueOnce(Promise.resolve({ data: [project] }))

    await projectStore.createProject(project)

    expect(apiClientPost).toHaveBeenCalledTimes(1)
    expect(apiClientPost.mock.calls[0][0]).toBe('/projects')
    expect(apiClientGet).toHaveBeenCalledTimes(1)
    expect(apiClientGet.mock.calls[0][0]).toBe('/projects')
    expect(projectStore.projects).toMatchObject([project])
  })

  it('Should set a project description by api call', async () => {
    const projectStore = useProjectStore()

    expect(projectStore.projects).toEqual([])

    const project = { id: 'projectId', description: 'Application de prise de rendez-vous en préfécture.' }
    apiClientPut.mockReturnValueOnce(Promise.resolve({ data: project }))
    apiClientGet.mockReturnValueOnce(Promise.resolve({ data: [] }))

    await projectStore.updateProject(project.id, { organizationId: 'organizationId', name: 'projectName', description: project.description })

    expect(apiClientPut).toHaveBeenCalledTimes(1)
    expect(apiClientPut.mock.calls[0][0]).toBe('/projects/projectId')
    expect(apiClientGet).toHaveBeenCalledTimes(1)
    expect(apiClientGet.mock.calls[0][0]).toBe('/projects')
    expect(projectStore.projects).toEqual([])
  })

  it('Should replay hooks for project by api call', async () => {
    const projectStore = useProjectStore()

    expect(projectStore.projects).toEqual([])

    const project = { id: 'projectId' }
    apiClientPut.mockReturnValueOnce(Promise.resolve({ data: project }))
    apiClientGet.mockReturnValueOnce(Promise.resolve({ data: [] }))

    await projectStore.replayHooksForProject(project.id)

    expect(apiClientPut).toHaveBeenCalledTimes(1)
    expect(apiClientPut.mock.calls[0][0]).toBe(`/projects/${project.id}/hooks`)
    expect(apiClientGet).toHaveBeenCalledTimes(1)
    expect(apiClientGet.mock.calls[0][0]).toBe('/projects')
    expect(projectStore.projects).toEqual([])
  })

  it('Should archive a project by api call', async () => {
    const projectStore = useProjectStore()
    const projects = [{ id: 'projectId' }]
    projectStore.projects = projects

    expect(projectStore.projects).toEqual(projects)

    const project = { id: 'projectId' }
    apiClientDelete.mockReturnValueOnce(Promise.resolve({ data: project }))
    apiClientGet.mockReturnValueOnce(Promise.resolve({ data: [] }))

    await projectStore.archiveProject('projectId')

    expect(apiClientDelete).toHaveBeenCalledTimes(1)
    expect(apiClientDelete.mock.calls[0][0]).toBe('/projects/projectId')
    expect(apiClientGet).toHaveBeenCalledTimes(1)
    expect(apiClientGet.mock.calls[0][0]).toBe('/projects')
    expect(projectStore.projects).toEqual([])
  })
})
