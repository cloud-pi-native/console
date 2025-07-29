import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { apiClient } from '../api/xhr-client'
import { useStageStore } from './stage'

const apiClientListStages = vi.spyOn(apiClient.Stages, 'listStages')
const apiClientGet = vi.spyOn(apiClient.Stages, 'getStageEnvironments')
const apiClientPost = vi.spyOn(apiClient.Stages, 'createStage')
const apiClientPut = vi.spyOn(apiClient.Stages, 'updateStage')
const apiClientDelete = vi.spyOn(apiClient.Stages, 'deleteStage')

describe('stage Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('should get stages list by api call', async () => {
    const data = [
      { id: 'id1', name: 'dev' },
      { id: 'id2', name: 'int' },
      { id: 'id3', name: 'prod' },
    ]
    apiClientListStages.mockReturnValueOnce(Promise.resolve({ status: 200, body: data }))
    const stageStore = useStageStore()

    await stageStore.getAllStages()

    expect(stageStore.stages).toEqual(data)
    expect(apiClientListStages).toHaveBeenCalledTimes(1)
  })

  it('should get a stage\'s associated environments by api call', async () => {
    const stageId = 'stageId'
    const data = [
      { id: 'id1', name: 'env1' },
      { id: 'id2', name: 'env2' },
      { id: 'id3', name: 'env3' },
    ]
    apiClientGet.mockReturnValueOnce(Promise.resolve({ status: 200, body: data }))
    const stageStore = useStageStore()

    const res = await stageStore.getStageAssociatedEnvironments(stageId)

    expect(res).toBe(data)
    expect(apiClientGet).toHaveBeenCalledTimes(1)
  })

  it('should create a stage by api call', async () => {
    const data = {
      name: 'int',
      quotaIds: ['quota1'],
    }

    apiClientPost.mockReturnValueOnce(Promise.resolve({ status: 201, body: data }))
    const stageStore = useStageStore()

    const res = await stageStore.addStage(data)

    expect(res).toBe(data)
    expect(apiClientPost).toHaveBeenCalledTimes(1)
  })

  it('should update a stage\'s quotas and clusters associated by api call', async () => {
    const stageId = 'stageId'
    const quotaIds = ['stage1']
    const clusterIds = ['cluster1']
    const data = {
      name: 'stageA',
      quotaIds,
      clusterIds,
      id: stageId,
    }

    apiClientPut.mockReturnValueOnce(Promise.resolve({ status: 200, body: data }))
    const stageStore = useStageStore()

    const res = await stageStore.updateStage(stageId, { quotaIds, clusterIds, name: 'stageA' })

    expect(res).toBe(data)
    expect(apiClientPut).toHaveBeenCalledTimes(1)
  })

  it('should delete a stage by api call', async () => {
    const stageId = 'stageId'

    apiClientDelete.mockReturnValueOnce(Promise.resolve({ status: 204 }))
    const stageStore = useStageStore()

    await stageStore.deleteStage(stageId)

    expect(apiClientDelete).toHaveBeenCalledTimes(1)
  })
})
