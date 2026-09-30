import type { AdminTokenRecord } from './admin-token-queries.utils'

export function toAdminToken({ permissions, ...token }: AdminTokenRecord) {
  return {
    ...token,
    permissions: permissions.toString(),
  }
}
