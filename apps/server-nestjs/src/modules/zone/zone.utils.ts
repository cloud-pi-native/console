import type { Zone as ZoneType } from './zone-queries.utils'

export function isZone(value: unknown): value is ZoneType {
  return (
    typeof value === 'object'
    && value !== null
    && 'id' in value
    && 'slug' in value
    && 'label' in value
    && 'argocdUrl' in value
  )
}
