export const SYSTEM_ROLE_TYPE = 'system' as const

export function generateSystemRoleType(type: string | null | undefined) {
  return `${SYSTEM_ROLE_TYPE}:${type}`
}

export function isSystemRoleType(type: string | null | undefined) {
  return !!type?.startsWith(`${SYSTEM_ROLE_TYPE}:`)
}

export function getBaseRoleType(type: string | null | undefined) {
  if (!type) return undefined
  return isSystemRoleType(type) ? type.slice(`${SYSTEM_ROLE_TYPE}:`.length + 1) : type
}

export function isManagedRoleType(type: string | null | undefined) {
  return getBaseRoleType(type) === 'managed'
}

export function isGlobalRoleType(type: string | null | undefined) {
  return getBaseRoleType(type) === 'global'
}

export function isExternalRoleType(type: string | null | undefined) {
  return getBaseRoleType(type) === 'external'
}
