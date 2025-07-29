import type { Hook } from './hook'
import { createHook } from './hook'
import type { ClusterObject } from './index'

export const upsertCluster: Hook<ClusterObject> = createHook()
export const deleteCluster: Hook<ClusterObject> = createHook()
