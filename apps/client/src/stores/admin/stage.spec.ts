import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../../api/xhr-client.js'
import { useAdminStageStore } from './stage.js'

const apiClientGetStages = vi.spyOn(apiClient.Stages, 'getStages')
const apiClientGet = vi.spyOn(apiClient.StagesAdmin, 'getStageEnvironments')
const apiClientPost = vi.spyOn(apiClient.StagesAdmin, 'createStage')
const apiClientPut = vi.spyOn(apiClient.QuotasAdmin, 'updateQuotaStage')
const apiClientPatch = vi.spyOn(apiClient.StagesAdmin, 'updateStageClusters')
const apiClientDelete = vi.spyOn(apiClient.StagesAdmin, 'deleteStage')

describe('Stage Store', () => {
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
    apiClientGetStages.mockReturnValueOnce(Promise.resolve({ status: 200, body: data }))
    const adminStageStore = useAdminStageStore()

    await adminStageStore.getAllStages()

    expect(adminStageStore.stages).toEqual(data)
    expect(apiClientGetStages).toHaveBeenCalledTimes(1)
  })

  it('Should get a stage\'s associated environments by api call', async () => {
    const stageId = 'stageId'
    const data = [
      { id: 'id1', name: 'env1' },
      { id: 'id2', name: 'env2' },
      { id: 'id3', name: 'env3' },
    ]
    apiClientGet.mockReturnValueOnce(Promise.resolve({ status: 200, body: data }))
    const adminStageStore = useAdminStageStore()

    const res = await adminStageStore.getStageAssociatedEnvironments(stageId)

    expect(res).toBe(data)
    expect(apiClientGet).toHaveBeenCalledTimes(1)
  })

  it('Should create a stage by api call', async () => {
    const data = {
      name: 'int',
      quotaIds: ['quota1'],
    }

    apiClientPost.mockReturnValueOnce(Promise.resolve({ status: 200, body: data }))
    const adminStageStore = useAdminStageStore()

    const res = await adminStageStore.addStage(data)

    expect(res).toBe(data)
    expect(apiClientPost).toHaveBeenCalledTimes(1)
  })

  it('Should update a stage\'s quotaStages by api call', async () => {
    const stageId = 'stageId'
    const quotaIds = ['stage1']

    apiClientPut.mockReturnValueOnce(Promise.resolve({ status: 200, body: 1 }))
    const adminStageStore = useAdminStageStore()

    const res = await adminStageStore.updateQuotaStage(stageId, quotaIds)

    expect(res).toBe(1)
    expect(apiClientPut).toHaveBeenCalledTimes(1)
  })

  it('Should update a stage\'s clusters by api call', async () => {
    const stageId = 'stageId'
    const clusterIds = ['stage1']

    apiClientPatch.mockReturnValueOnce(Promise.resolve({ status: 200, body: 1 }))
    const adminStageStore = useAdminStageStore()

    const res = await adminStageStore.updateStageClusters(stageId, clusterIds)

    expect(res).toBe(1)
    expect(apiClientPatch).toHaveBeenCalledTimes(1)
  })

  it('Should delete a stage by api call', async () => {
    const stageId = 'stageId'

    apiClientDelete.mockReturnValueOnce(Promise.resolve({ status: 204 }))
    const adminStageStore = useAdminStageStore()

    await adminStageStore.deleteStage(stageId)

    expect(apiClientDelete).toHaveBeenCalledTimes(1)
  })
})
