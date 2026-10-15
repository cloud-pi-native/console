import type { Zone as ZoneContract } from '@cpn-console/shared'
import type { Zone } from './zone-queries.utils'

export function toZone(record: Zone): ZoneContract {
  return {
    id: record.id,
    slug: record.slug,
    label: record.label,
    argocdUrl: record.argocdUrl,
    description: record.description ?? '',
  }
}

export function toZones(records: Zone[]): ZoneContract[] {
  return records.map(toZone)
}
