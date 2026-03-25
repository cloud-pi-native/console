import type { Hook } from './hook.ts'
import type { UserObject } from './index.ts'
import { createHook } from './hook.ts'

export interface AdminRole {
  id: string
  name: string
  permissions: bigint
  position: number
  oidcGroup: string
  members: UserObject[]
}

export const upsertAdminRole: Hook<AdminRole> = createHook()
export const deleteAdminRole: Hook<AdminRole> = createHook()
