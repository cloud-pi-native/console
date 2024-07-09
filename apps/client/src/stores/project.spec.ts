import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../api/xhr-client.js'
import { useProjectStore } from './project.js'
import { useUsersStore } from './users.js'

const apiClientGet = vi.spyOn(apiClient.Projects, 'getProjects')
const apiClientList = vi.spyOn(apiClient.Projects, 'listProjects')
const apiClientPost = vi.spyOn(apiClient.Projects, 'createProject')
const apiClientPut = vi.spyOn(apiClient.Projects, 'updateProject')
const apiClientReplayHooks = vi.spyOn(apiClient.Projects, 'replayHooksForProject')
const apiClientDelete = vi.spyOn(apiClient.Projects, 'archiveProject')
const apiClientPatch = vi.spyOn(apiClient.Projects, 'patchProject')

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
    apiClientGet.mockReturnValueOnce(Promise.resolve({ status: 200, body: projects }))

    await projectStore.getUserProjects()

    expect(apiClientGet).toHaveBeenCalledTimes(1)
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
    apiClientGet.mockReturnValueOnce(Promise.resolve({ status: 200, body: projects }))

    await projectStore.getUserProjects()

    expect(apiClientGet).toHaveBeenCalledTimes(1)
    expect(projectStore.projects).toMatchObject(projects)
    expect(projectStore.selectedProject).toMatchObject(project)
  })

  it('Should create a project by api call', async () => {
    const projectStore = useProjectStore()

    expect(projectStore.projects).toEqual([])

    const project = { id: 'projectId' }
    apiClientPost.mockReturnValueOnce(Promise.resolve({ status: 201, body: project }))
    apiClientGet.mockReturnValueOnce(Promise.resolve({ status: 200, body: [project] }))

    await projectStore.createProject(project)

    expect(apiClientPost).toHaveBeenCalledTimes(1)
    expect(apiClientGet).toHaveBeenCalledTimes(1)
    expect(projectStore.projects).toMatchObject([project])
  })

  it('Should set a project description by api call', async () => {
    const projectStore = useProjectStore()

    expect(projectStore.projects).toEqual([])

    const project = { id: 'projectId', description: 'Application de prise de rendez-vous en préfécture.' }
    apiClientPut.mockReturnValueOnce(Promise.resolve({ status: 200, body: project }))
    apiClientGet.mockReturnValueOnce(Promise.resolve({ status: 200, body: [] }))

    await projectStore.updateProject(project.id, { organizationId: 'organizationId', name: 'projectName', description: project.description })

    expect(apiClientPut).toHaveBeenCalledTimes(1)
    expect(apiClientGet).toHaveBeenCalledTimes(1)
    expect(projectStore.projects).toEqual([])
  })

  it('Should replay hooks for project by api call', async () => {
    const projectStore = useProjectStore()

    expect(projectStore.projects).toEqual([])

    const project = { id: 'projectId' }
    apiClientReplayHooks.mockReturnValueOnce(Promise.resolve({ status: 204, body: project }))
    apiClientGet.mockReturnValueOnce(Promise.resolve({ status: 200, body: [] }))

    await projectStore.replayHooksForProject(project.id)

    expect(apiClientReplayHooks).toHaveBeenCalledTimes(1)
    expect(apiClientGet).toHaveBeenCalledTimes(1)
    expect(projectStore.projects).toEqual([])
  })

  it('Should archive a project by api call', async () => {
    const projectStore = useProjectStore()
    const projects = [{ id: 'projectId' }]
    projectStore.projects = projects

    expect(projectStore.projects).toEqual(projects)

    apiClientDelete.mockReturnValueOnce(Promise.resolve({ status: 204 }))
    apiClientGet.mockReturnValueOnce(Promise.resolve({ status: 200, body: [] }))

    await projectStore.archiveProject('projectId')

    expect(apiClientDelete).toHaveBeenCalledTimes(1)
    expect(apiClientGet).toHaveBeenCalledTimes(1)
    expect(projectStore.projects).toEqual([])
  })
})

describe('Project Admin Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('Should get project list by api call', async () => {
    const data = [
      { id: 'id1', name: 'project1', status: 'archived', members: [{ userId: 'a', role: 'user', email: 'test@test.com' }] },
      { id: 'id2', name: 'project2', status: 'created', members: [{ userId: 'a', role: 'user', email: 'test@test.com' }] },
      { id: 'id3', name: 'project3', status: 'created', members: [{ userId: 'a', role: 'user', email: 'test@test.com' }] },
    ]
    apiClientList.mockReturnValueOnce(Promise.resolve({ status: 200, body: data }))
    const projectStore = useProjectStore()

    const res = await projectStore.getAllProjects({})

    expect(res).toBe(data)
    expect(apiClientList).toHaveBeenCalledTimes(1)
  })

  it('Should get active project list by api call', async () => {
    const data = [
      { id: 'id2', name: 'project2', status: 'created', members: [{ userId: 'a', role: 'user', email: 'test@test.com' }] },
      { id: 'id3', name: 'project3', status: 'created', members: [{ userId: 'a', role: 'user', email: 'test@test.com' }] },
    ]
    apiClientList.mockReturnValueOnce(Promise.resolve({ status: 200, body: data }))
    const projectStore = useProjectStore()

    const res = await projectStore.getAllProjects({ statusNotIn: 'archived' })

    expect(res).toStrictEqual(data)
    expect(apiClientList).toHaveBeenCalledTimes(1)
  })

  it('Should lock or unlock a project', async () => {
    const project = { id: 'id1', name: 'project1', status: 'archived', locked: true }
    apiClientPatch.mockReturnValueOnce(Promise.resolve({ status: 200 }))
    const projectStore = useProjectStore()

    const res = await projectStore.handleProjectLocking(project.id, project.locked)

    expect(res).toBe(undefined)
    expect(apiClientPatch).toHaveBeenCalledTimes(1)
  })
})
