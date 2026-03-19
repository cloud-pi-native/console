import type { Hook } from './hook.js'
import type { ClusterObject } from './index.js'
import { createHook } from './hook.js'

export const upsertCluster: Hook<ClusterObject> = createHook()
export const deleteCluster: Hook<ClusterObject> = createHook()
