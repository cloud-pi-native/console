export const systemRoleTypePrefix = 'system:' as const

export function isSystemRole(type: string | null | undefined) {
  return !!type?.startsWith(systemRoleTypePrefix)
}

function getBaseRole(type: string | null | undefined) {
  if (!type) return undefined
  return isSystemRole(type) ? type.slice(systemRoleTypePrefix.length) : type
}

export function isManagedRole(type: string | null | undefined) {
  return getBaseRole(type) === 'managed'
}

export function isGlobalRole(type: string | null | undefined) {
  return getBaseRole(type) === 'global'
}

export function isExternalRole(type: string | null | undefined) {
  return getBaseRole(type) === 'external'
}
