import { Hook, createHook } from './hook.js'
import { ClusterObject } from './index.js'

export const upsertCluster: Hook<ClusterObject, ClusterObject> = createHook()
export const deleteCluster: Hook<ClusterObject, ClusterObject> = createHook()
