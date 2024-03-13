import { type Hook, createHook } from './hook.js'
import type { ClusterObject, EnvironmentBase, UserObject } from './index.js'

export type PermissionManageUserArgs = EnvironmentBase & {
  stage: string
  user: UserObject
  permissions: {
    ro: boolean
    rw: boolean
  }
  cluster: ClusterObject
}

export const setEnvPermission: Hook<PermissionManageUserArgs, Record<string, never>> = createHook()
