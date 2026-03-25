import type { Hook } from './hook.ts'
import type { ClusterObject } from './index.ts'
import { createHook } from './hook.ts'

export const upsertCluster: Hook<ClusterObject> = createHook()
export const deleteCluster: Hook<ClusterObject> = createHook()
