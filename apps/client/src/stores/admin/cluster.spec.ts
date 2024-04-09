import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../../api/xhr-client.js'
import { useAdminClusterStore } from './cluster.js'
import { ClusterPrivacy } from '@cpn-console/shared'

const apiClientGet = vi.spyOn(apiClient.Clusters, 'getClusters')
const apiClientGetClusterEnvironments = vi.spyOn(apiClient.ClustersAdmin, 'getClusterEnvironments')
const apiClientPost = vi.spyOn(apiClient.ClustersAdmin, 'createCluster')
const apiClientPut = vi.spyOn(apiClient.ClustersAdmin, 'updateCluster')
const apiClientDelete = vi.spyOn(apiClient.ClustersAdmin, 'deleteCluster')

describe('Cluster Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('Should get clusters list by api call', async () => {
    const data = [
      {
        id: '1e4fdb28-f9ea-46d4-ad16-607c7f1aa8b6',
        label: 'cluster1',
        projectIds: [
          '22e7044f-8414-435d-9c4a-2df42a65034b',
        ],
        user: {
          certData: 'userCAD',
          keyData: 'userCKD',
        },
        cluster: {
          caData: 'clusterCAD',
          server: 'https://coucou.com:5000',
          tlsServerName: 'coucou.com',
        },
        clusterResources: true,
        privacy: ClusterPrivacy.DEDICATED,
      },
      {
        id: '1e4fdb28-f9ea-46d4-ad16-607c7f1aa8b7',
        label: 'cluster2',
        projectIds: [
          '22e7044f-8414-435d-9c4a-2df42a65034b',
        ],
        user: {
          certData: 'userCAD',
          keyData: 'userCKD',
        },
        clusterResources: true,
        privacy: 'public',
      },
    ]
    apiClientGet.mockReturnValueOnce(Promise.resolve({ status: 200, body: data }))
    const adminClusterStore = useAdminClusterStore()

    const res = await adminClusterStore.getClusters()

    expect(res).toEqual(data)
    expect(apiClientGet).toHaveBeenCalledTimes(1)
  })

  it('Should get cluster\'s associated environments by api call', async () => {
    const clusterId = '1e4fdb28-f9ea-46d4-ad16-607c7f1aa8b6'
    const data = {
      environments: [],
    }

    apiClientGetClusterEnvironments.mockReturnValueOnce(Promise.resolve({ status: 200, body: data }))
    const adminClusterStore = useAdminClusterStore()

    const res = await adminClusterStore.getClusterAssociatedEnvironments(clusterId)

    expect(res).toBe(data)
    expect(apiClientGetClusterEnvironments).toHaveBeenCalledTimes(1)
  })

  it('Should add cluster by api call', async () => {
    const data = {
      id: '1e4fdb28-f9ea-46d4-ad16-607c7f1aa8b6',
      label: 'cluster1',
      projectIds: [
        '22e7044f-8414-435d-9c4a-2df42a65034b',
      ],
      user: {
        certData: 'userCAD',
        keyData: 'userCKD',
      },
      cluster: {
        caData: 'clusterCAD',
        server: 'https://coucou.com:5000',
        tlsServerName: 'coucou.com',
      },
      clusterResources: true,
      privacy: ClusterPrivacy.DEDICATED,
    }
    apiClientPost.mockReturnValueOnce(Promise.resolve({ status: 200, body: data }))
    const adminClusterStore = useAdminClusterStore()

    const res = await adminClusterStore.addCluster(data)

    expect(res).toBe(data)
    expect(apiClientPost).toHaveBeenCalledTimes(1)
  })

  it('Should update cluster by api call', async () => {
    const data = {
      id: '1e4fdb28-f9ea-46d4-ad16-607c7f1aa8b6',
      projectIds: [
        '22e7044f-8414-435d-9c4a-2df42a65034b',
      ],
      user: {
        certData: 'userCAD',
        keyData: 'userCKD',
      },
      cluster: {
        caData: 'clusterCAD',
        server: 'https://coucou.com:5000',
        tlsServerName: 'coucou.com',
      },
      clusterResources: true,
      privacy: ClusterPrivacy.DEDICATED,
    }
    apiClientPut.mockReturnValueOnce(Promise.resolve({ status: 200, body: data }))
    const adminClusterStore = useAdminClusterStore()

    const res = await adminClusterStore.updateCluster(data)

    expect(res).toBe(data)
    expect(apiClientPut).toHaveBeenCalledTimes(1)
  })

  it('Should delete cluster by api call', async () => {
    const clusterId = '1e4fdb28-f9ea-46d4-ad16-607c7f1aa8b6'

    apiClientDelete.mockReturnValueOnce(Promise.resolve({}))
    const adminClusterStore = useAdminClusterStore()

    await adminClusterStore.deleteCluster(clusterId)

    expect(apiClientDelete).toHaveBeenCalledTimes(1)
  })
})
