import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { createRandomDbSetup, getRandomMember, getRandomProject } from '@cpn-console/test-utils'
import { apiClient } from '../api/xhr-client.js'
import { useProjectStore } from './project.js'
import { useOrganizationStore } from './organization.js'

const listOrganizations = vi.spyOn(apiClient.Organizations, 'listOrganizations')
const listProjects = vi.spyOn(apiClient.Projects, 'listProjects')
const apiClientPost = vi.spyOn(apiClient.Projects, 'createProject')
const apiClientPut = vi.spyOn(apiClient.Projects, 'updateProject')
const apiClientReplayHooks = vi.spyOn(apiClient.Projects, 'replayHooksForProject')
const apiClientDelete = vi.spyOn(apiClient.Projects, 'archiveProject')

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
    const organizationStore = useOrganizationStore()
    const randomDbSetup = createRandomDbSetup({})

    expect(organizationStore.organizations).toEqual([])
    expect(projectStore.projects).toEqual([])

    const projects = [randomDbSetup.project]
    const organizations = [randomDbSetup.organization]

    listOrganizations.mockReturnValueOnce(Promise.resolve({ status: 200, body: organizations, headers: {} }))
    listProjects.mockReturnValueOnce(Promise.resolve({ status: 200, body: projects, headers: {} }))

    await projectStore.listProjects()

    expect(listOrganizations).toHaveBeenCalledTimes(1)
    expect(listProjects).toHaveBeenCalledTimes(1)
    expect(projectStore.projects).toMatchObject(projects)
    expect(organizationStore.organizations).toMatchObject(organizations)
  })

  it('Should retrieve user\'s projects by api call (with actual working projet)', async () => {
    const projectStore = useProjectStore()
    const organizationStore = useOrganizationStore()
    const randomDbSetup = createRandomDbSetup({})

    expect(organizationStore.organizations).toEqual([])
    expect(projectStore.projects).toEqual([])

    const projects = [randomDbSetup.project]
    const organizations = [randomDbSetup.organization]
    projectStore.selectedProject = randomDbSetup.project

    listOrganizations.mockReturnValueOnce(Promise.resolve({ status: 200, body: organizations, headers: {} }))
    listProjects.mockReturnValueOnce(Promise.resolve({ status: 200, body: projects, headers: {} }))

    await projectStore.listProjects({ filter: 'member' })

    expect(listOrganizations).toHaveBeenCalledTimes(1)
    expect(listProjects).toHaveBeenCalledTimes(1)
    expect(projectStore.projects).toMatchObject(projects)
    expect(projectStore.selectedProject).toMatchObject(projects[0])
    expect(organizationStore.organizations).toMatchObject(organizations)
  })

  it('Should create a project by api call', async () => {
    const projectStore = useProjectStore()
    const organizationStore = useOrganizationStore()
    const randomDbSetup = createRandomDbSetup({})

    expect(organizationStore.organizations).toEqual([])
    expect(projectStore.projects).toEqual([])

    const projects = [randomDbSetup.project]
    const organizations = [randomDbSetup.organization]
    const newProject = getRandomProject(organizations[0].id)
    newProject.members = [getRandomMember(randomDbSetup.users[0].id, 'owner')]

    apiClientPost.mockReturnValueOnce(Promise.resolve({ status: 201, body: newProject, headers: {} }))
    listOrganizations.mockReturnValueOnce(Promise.resolve({ status: 200, body: organizations, headers: {} }))
    listProjects.mockReturnValueOnce(Promise.resolve({ status: 200, body: [...projects, newProject], headers: {} }))

    await projectStore.createProject(newProject)

    expect(apiClientPost).toHaveBeenCalledTimes(1)
    expect(listProjects).toHaveBeenCalledTimes(1)
    expect(listOrganizations).toHaveBeenCalledTimes(1)
    expect(projectStore.projects).toMatchObject([...projects, newProject])
  })

  it('Should set a project description by api call', async () => {
    const projectStore = useProjectStore()
    const organizationStore = useOrganizationStore()
    const randomDbSetup = createRandomDbSetup({})
    const description = 'Application de prise de rendez-vous en préfécture.'

    expect(organizationStore.organizations).toEqual([])
    expect(projectStore.projects).toEqual([])

    const organizations = [randomDbSetup.organization]
    const updatedProject = { ...randomDbSetup.project, organization: organizations[0], description }

    apiClientPut.mockReturnValueOnce(Promise.resolve({ status: 200, body: updatedProject, headers: {} }))
    listOrganizations.mockReturnValueOnce(Promise.resolve({ status: 200, body: organizations, headers: {} }))
    listProjects.mockReturnValueOnce(Promise.resolve({ status: 200, body: [updatedProject], headers: {} }))

    await projectStore.updateProject(randomDbSetup.project.id, { description })

    expect(apiClientPut).toHaveBeenCalledTimes(1)
    expect(listProjects).toHaveBeenCalledTimes(1)
    expect(listOrganizations).toHaveBeenCalledTimes(1)
    expect(organizationStore.organizations).toMatchObject(organizations)
    expect(projectStore.projects).toEqual([updatedProject])
  })

  it('Should replay hooks for project by api call', async () => {
    const projectStore = useProjectStore()
    const organizationStore = useOrganizationStore()
    const randomDbSetup = createRandomDbSetup({})

    expect(organizationStore.organizations).toEqual([])
    expect(projectStore.projects).toEqual([])

    const project = { ...randomDbSetup.project, organization: randomDbSetup.organization }

    apiClientReplayHooks.mockReturnValueOnce(Promise.resolve({ status: 204, body: project, headers: {} }))
    listOrganizations.mockReturnValueOnce(Promise.resolve({ status: 200, body: [randomDbSetup.organization], headers: {} }))
    listProjects.mockReturnValueOnce(Promise.resolve({ status: 200, body: [project], headers: {} }))

    await projectStore.replayHooksForProject(project.id)

    expect(apiClientReplayHooks).toHaveBeenCalledTimes(1)
    expect(listProjects).toHaveBeenCalledTimes(1)
    expect(projectStore.projects).toEqual([project])
  })

  it('Should archive a project by api call', async () => {
    const projectStore = useProjectStore()
    const organizationStore = useOrganizationStore()
    const randomDbSetup = createRandomDbSetup({})

    expect(organizationStore.organizations).toEqual([])
    expect(projectStore.projects).toEqual([])

    const projects = [randomDbSetup.project]

    apiClientDelete.mockReturnValueOnce(Promise.resolve({ status: 204 }))
    listOrganizations.mockReturnValueOnce(Promise.resolve({ status: 200, body: [randomDbSetup.organization], headers: {} }))
    listProjects.mockReturnValueOnce(Promise.resolve({ status: 200, body: [] }))

    await projectStore.archiveProject(projects[0].id)

    expect(apiClientDelete).toHaveBeenCalledTimes(1)
    expect(listProjects).toHaveBeenCalledTimes(1)
    expect(projectStore.projects).toEqual([])
  })
})
