import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../../api/xhr-client.js'
import { useAdminProjectStore } from './project.js'

const apiClientGet = vi.spyOn(apiClient, 'get')
const apiClientDelete = vi.spyOn(apiClient, 'delete')
const apiClientPatch = vi.spyOn(apiClient, 'patch')

describe('Counter Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('Should get project list by api call', async () => {
    const data = [
      { id: 'id1', name: 'project1', status: 'archived', roles: [{ user: { id: '1' } }] },
      { id: 'id2', name: 'project2', status: 'created', roles: [{ user: { id: '1' } }] },
      { id: 'id3', name: 'project3', status: 'created', roles: [{ user: { id: '1' } }] },
    ]
    apiClientGet.mockReturnValueOnce(Promise.resolve({ data }))
    const adminProjectStore = useAdminProjectStore()

    const res = await adminProjectStore.getAllProjects()

    expect(res).toBe(data)
    expect(apiClientGet).toHaveBeenCalledTimes(1)
    expect(apiClientGet.mock.calls[0][0]).toBe('/admin/projects')
  })

  it('Should get active project list by api call', async () => {
    const data = [
      { id: 'id1', name: 'project1', status: 'archived', roles: [{ user: { id: '1' } }] },
      { id: 'id2', name: 'project2', status: 'created', roles: [{ user: { id: '1' } }] },
      { id: 'id3', name: 'project3', status: 'created', roles: [{ user: { id: '1' } }] },
    ]
    apiClientGet.mockReturnValueOnce(Promise.resolve({ data }))
    const adminProjectStore = useAdminProjectStore()

    const res = await adminProjectStore.getAllActiveProjects()

    expect(res).toStrictEqual(data.splice(1))
    expect(apiClientGet).toHaveBeenCalledTimes(1)
    expect(apiClientGet.mock.calls[0][0]).toBe('/admin/projects')
  })

  it('Should lock or unlock a project', async () => {
    const project = { id: 'id1', name: 'project1', status: 'archived', locked: true }
    apiClientPatch.mockReturnValueOnce(Promise.resolve({}))
    const adminProjectStore = useAdminProjectStore()

    const res = await adminProjectStore.handleProjectLocking(project.id, project.locked)

    expect(res).toBe(undefined)
    expect(apiClientPatch).toHaveBeenCalledTimes(1)
    expect(apiClientPatch.mock.calls[0][0]).toBe(`/admin/projects/${project.id}`)
  })

  it('Should archive a project by api call', async () => {
    const adminProjectStore = useAdminProjectStore()

    const project = { id: 'projectId' }
    apiClientDelete.mockReturnValueOnce(Promise.resolve({ data: project }))

    await adminProjectStore.archiveProject('projectId')

    expect(apiClientDelete).toHaveBeenCalledTimes(1)
    expect(apiClientDelete.mock.calls[0][0]).toBe('/projects/projectId')
  })
})
