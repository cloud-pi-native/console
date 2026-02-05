import type { Hook } from './hook.js'
import { createHook } from './hook.js'
import type { UserObject } from './index.js'

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
