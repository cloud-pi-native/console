import type { ExposedPersonalAccessToken, PersonalAccessToken } from '@cpn-console/shared'
import type { UserToken } from './user-tokens-queries.utils'

export function toPersonalAccessToken(record: UserToken): PersonalAccessToken {
  return {
    id: record.id,
    name: record.name,
    lastUse: record.lastUse?.toISOString() ?? null,
    expirationDate: record.expirationDate.toISOString(),
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    owner: record.owner,
  }
}

export function toExposedPersonalAccessToken(record: UserToken, password: string): ExposedPersonalAccessToken {
  return {
    ...toPersonalAccessToken(record),
    password,
  }
}
