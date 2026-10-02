import type { AdminToken } from './admin-token-queries.utils'

export function toAdminToken({ permissions, ...token }: AdminToken) {
  return {
    ...token,
    permissions: permissions.toString(),
  }
}

export function toExposedAdminToken(record: AdminToken, password: string) {
  return { ...toAdminToken(record), password }
}
