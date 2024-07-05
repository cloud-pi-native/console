import {
  getZones as getZonesQuery,
} from './queries.js'

export const getZones = async () => {
  const zones = await getZonesQuery()
  return zones.map(({ clusters, ...zone }) => ({
    ...zone,
    clusterIds: clusters.map(({ id }) => id),
  }))
}
