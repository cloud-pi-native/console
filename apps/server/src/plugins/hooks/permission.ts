import { type Hook, createHook } from './hook.js'
import type { EnvironmentBase } from './index.js'
import type { User, Cluster } from '@prisma/client'

export type PermissionManageUserArgs = Omit<EnvironmentBase, 'roles' | 'environments'> & {
  user: User
  permissions: {
    ro: boolean
    rw: boolean
  }
  cluster: Cluster
}

export const setEnvPermission: Hook<PermissionManageUserArgs, void> = createHook()
