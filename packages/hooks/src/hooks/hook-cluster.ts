import type { Hook } from './hook.js'
import { createHook } from './hook.js'
import type { ClusterObject } from './index.js'

export const upsertCluster: Hook<ClusterObject, ClusterObject> = createHook()
export const deleteCluster: Hook<ClusterObject, ClusterObject> = createHook()
