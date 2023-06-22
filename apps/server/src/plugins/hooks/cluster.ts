import { ClusterModel } from 'shared/types/index.js'
import { type Hook, createHook } from './hook.js'

type createClusterExecArgs = ClusterModel
type createClusterValidateArgs = Omit<ClusterModel, 'id'>

type deleteClusterExecArgs = Pick<ClusterModel, 'secretName'>

export const createCluster: Hook<createClusterExecArgs, createClusterValidateArgs> = createHook()
export const deleteCluster: Hook<deleteClusterExecArgs, void> = createHook()
