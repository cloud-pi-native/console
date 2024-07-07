import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../../api/xhr-client.js'
import { useAdminProjectStore } from './project.js'

const apiClientGet = vi.spyOn(apiClient.Projects, 'listProjects')
const apiClientPatch = vi.spyOn(apiClient.ProjectsAdmin, 'patchProject')

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
    apiClientGet.mockReturnValueOnce(Promise.resolve({ status: 200, body: data }))
    const adminProjectStore = useAdminProjectStore()

    const res = await adminProjectStore.getAllProjects({})

    expect(res).toBe(data)
    expect(apiClientGet).toHaveBeenCalledTimes(1)
  })

  it('Should get active project list by api call', async () => {
    const data = [
      { id: 'id2', name: 'project2', status: 'created', members: [{ userId: 'a', role: 'user', email: 'test@test.com' }] },
      { id: 'id3', name: 'project3', status: 'created', members: [{ userId: 'a', role: 'user', email: 'test@test.com' }] },
    ]
    apiClientGet.mockReturnValueOnce(Promise.resolve({ status: 200, body: data }))
    const adminProjectStore = useAdminProjectStore()

    const res = await adminProjectStore.getAllProjects({ statusNotIn: 'archived' })

    expect(res).toStrictEqual(data)
    expect(apiClientGet).toHaveBeenCalledTimes(1)
  })

  it('Should lock or unlock a project', async () => {
    const project = { id: 'id1', name: 'project1', status: 'archived', locked: true }
    apiClientPatch.mockReturnValueOnce(Promise.resolve({ status: 200 }))
    const adminProjectStore = useAdminProjectStore()

    const res = await adminProjectStore.handleProjectLocking(project.id, project.locked)

    expect(res).toBe(undefined)
    expect(apiClientPatch).toHaveBeenCalledTimes(1)
  })
})
