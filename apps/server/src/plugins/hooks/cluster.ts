import { type Hook, createHook } from './hook.js'
import type { ClusterMix } from '@/types/index.js'

export type CreateClusterExecArgs = ClusterMix
export type UpdateClusterExecArgs = ClusterMix
export type CreateClusterValidateArgs = ClusterMix
export type DeleteClusterExecArgs = Pick<ClusterMix, 'secretName'>

export const createCluster: Hook<CreateClusterExecArgs, CreateClusterValidateArgs> = createHook()
export const updateCluster: Hook<CreateClusterExecArgs, CreateClusterValidateArgs> = createHook()
export const deleteCluster: Hook<DeleteClusterExecArgs, void> = createHook()
