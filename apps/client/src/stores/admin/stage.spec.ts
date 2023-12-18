import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../../api/xhr-client.js'
import { useAdminStageStore } from './stage.js'

const apiClientGet = vi.spyOn(apiClient, 'get')
const apiClientPost = vi.spyOn(apiClient, 'post')
const apiClientPut = vi.spyOn(apiClient, 'put')
const apiClientDelete = vi.spyOn(apiClient, 'delete')

describe('Quota Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('Should get stages list by api call', async () => {
    const data = [
      { id: 'id1', name: 'dev' },
      { id: 'id2', name: 'int' },
      { id: 'id3', name: 'prod' },
    ]
    apiClientGet.mockReturnValueOnce(Promise.resolve({ data }))
    const adminStageStore = useAdminStageStore()

    await adminStageStore.getAllStages()

    expect(adminStageStore.stages).toEqual(data)
    expect(apiClientGet).toHaveBeenCalledTimes(1)
    expect(apiClientGet.mock.calls[0][0]).toBe('/stages')
  })

  it('Should get a stage\'s associated environments by api call', async () => {
    const stageId = 'stageId'
    const data = [
      { id: 'id1', name: 'env1' },
      { id: 'id2', name: 'env2' },
      { id: 'id3', name: 'env3' },
    ]
    apiClientGet.mockReturnValueOnce(Promise.resolve({ data }))
    const adminStageStore = useAdminStageStore()

    const res = await adminStageStore.getStageAssociatedEnvironments(stageId)

    expect(res).toBe(data)
    expect(apiClientGet).toHaveBeenCalledTimes(1)
    expect(apiClientGet.mock.calls[0][0]).toBe(`/admin/stages/${stageId}/environments`)
  })

  it('Should create a stage by api call', async () => {
    const data = {
      name: 'int',
      quotaIds: ['quota1'],
    }

    apiClientPost.mockReturnValueOnce(Promise.resolve({ data }))
    const adminStageStore = useAdminStageStore()

    const res = await adminStageStore.addStage(data)

    expect(res).toBe(data)
    expect(apiClientPost).toHaveBeenCalledTimes(1)
    expect(apiClientPost.mock.calls[0][0]).toBe('/admin/stages')
  })

  it('Should update a stage\'s quotaStages by api call', async () => {
    const stageId = 'stageId'
    const quotaIds = ['stage1']

    apiClientPut.mockReturnValueOnce(Promise.resolve({ data: 1 }))
    const adminStageStore = useAdminStageStore()

    const res = await adminStageStore.updateQuotaStage(stageId, quotaIds)

    expect(res).toBe(1)
    expect(apiClientPut).toHaveBeenCalledTimes(1)
    expect(apiClientPut.mock.calls[0][0]).toBe('/admin/quotas/quotastages')
  })

  it('Should update a stage\'s clusters by api call', async () => {
    const stageId = 'stageId'
    const clusterIds = ['stage1']

    apiClientPut.mockReturnValueOnce(Promise.resolve({ data: 1 }))
    const adminStageStore = useAdminStageStore()

    const res = await adminStageStore.updateStageClusters(stageId, clusterIds)

    expect(res).toBe(1)
    expect(apiClientPut).toHaveBeenCalledTimes(1)
    expect(apiClientPut.mock.calls[0][0]).toBe(`/admin/stages/${stageId}/clusters`)
  })

  it('Should delete a stage by api call', async () => {
    const stageId = 'stageId'

    apiClientDelete.mockReturnValueOnce(Promise.resolve({ data: 1 }))
    const adminStageStore = useAdminStageStore()

    const res = await adminStageStore.deleteStage(stageId)

    expect(res).toBe(1)
    expect(apiClientDelete).toHaveBeenCalledTimes(1)
    expect(apiClientDelete.mock.calls[0][0]).toBe(`/admin/stages/${stageId}`)
  })
})
