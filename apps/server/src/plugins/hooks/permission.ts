import { type Hook, createHook } from './hook.js'
import { UserModel } from '@dso-console/shared'
import type { EnvironmentBase } from './index.js'
import { Cluster } from '@prisma/client'

export type PermissionManageUserArgs = EnvironmentBase & {
  user: UserModel
  permissions: {
    ro: boolean
    rw: boolean
  }
  cluster: Cluster
}

export const setEnvPermission: Hook<PermissionManageUserArgs, void> = createHook()
