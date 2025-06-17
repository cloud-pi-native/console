import { describe, expect, it } from 'vitest'

import { getRandomCluster } from '@cpn-console/test-utils'

import { getClusterResourcesWhitelist } from './app-project'

describe('getClusterResourcesWhitelist()', () => {
  describe('when cluster is public, and cluster-wide resources are requested', () => {
    it('returns an empty whitelist for allowed cluster-wide resources', async () => {
      expect(
        getClusterResourcesWhitelist({
          ...getRandomCluster({}),
          privacy: 'public',
          clusterResources: true,
        }),
      ).toEqual([])
    })
  })

  describe('when cluster is dedicated, and cluster-wide resources are not requested', () => {
    it('returns an empty whitelist for allowed cluster-wide resources', async () => {
      expect(
        getClusterResourcesWhitelist({
          ...getRandomCluster({}),
          privacy: 'dedicated',
          clusterResources: false,
        }),
      ).toEqual([])
    })
  })

  describe('when cluster is dedicated, and cluster-wide resources are requested', () => {
    it('returns a whitelist for allowed cluster-wide resources', async () => {
      expect(
        getClusterResourcesWhitelist({
          ...getRandomCluster({}),
          privacy: 'dedicated',
          clusterResources: true,
        }),
      ).toEqual([
        {
          group: '*',
          kind: '*',
        },
      ])
    })
  })
})
