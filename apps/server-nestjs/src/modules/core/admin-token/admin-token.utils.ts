import type { AdminTokenRecord } from './admin-token-queries.utils'

export function toAdminToken({ permissions, ...token }: AdminTokenRecord) {
  return {
    ...token,
    permissions: permissions.toString(),
  }
}

export function toExposedAdminToken(record: AdminTokenRecord, password: string) {
  return { ...toAdminToken(record), password }
}
