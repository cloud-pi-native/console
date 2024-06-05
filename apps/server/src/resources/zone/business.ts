import { Cluster, Zone } from '@prisma/client'
import {
  getZones as getZonesQuery,
} from './queries.js'

type bindZoneAndClusterIdsParam = Zone & { clusters: { id: Cluster['id'] }[] }

export const bindZoneAndClusterIds = ({ clusters, ...zone }: bindZoneAndClusterIdsParam) => ({
  ...zone,
  clusterIds: clusters.map(({ id }) => id),
})

export const getZones = async () => {
  const zones = await getZonesQuery()
  return zones.map(zone => bindZoneAndClusterIds(zone))
}
