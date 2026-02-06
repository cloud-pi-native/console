import type { ProjectRole } from '@cpn-console/shared'
import type { Hook } from './hook.js'
import { createHook } from './hook.js'

export const upsertProjectRole: Hook<ProjectRole> = createHook()
export const deleteProjectRole: Hook<ProjectRole> = createHook()
