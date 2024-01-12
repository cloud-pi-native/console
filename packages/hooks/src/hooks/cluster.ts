import { type Hook, createHook } from './hook.js'
import { ClusterObject } from './index.js'

export type CreateClusterExecArgs = ClusterObject
export type UpdateClusterExecArgs = ClusterObject
export type CreateClusterValidateArgs = ClusterObject
export type DeleteClusterExecArgs = { secretName: string }

export const createCluster: Hook<CreateClusterExecArgs, CreateClusterValidateArgs> = createHook()
export const updateCluster: Hook<CreateClusterExecArgs, CreateClusterValidateArgs> = createHook()
export const deleteCluster: Hook<DeleteClusterExecArgs, Record<string, never>> = createHook()
