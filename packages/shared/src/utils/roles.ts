export const systemRoleTypePrefix = 'system:' as const

export function isSystemRole(type: string | null | undefined) {
  return !!type?.startsWith(systemRoleTypePrefix)
}

function getBaseRole(type: string | null | undefined) {
  if (!type) return undefined
  return isSystemRole(type) ? type.slice(systemRoleTypePrefix.length) : type
}

export function isManaged(type: string | null | undefined) {
  return getBaseRole(type) === 'managed'
}

export function isGlobal(type: string | null | undefined) {
  return getBaseRole(type) === 'global'
}

export function isExternal(type: string | null | undefined) {
  return getBaseRole(type) === 'external'
}
