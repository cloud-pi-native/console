import type { Hook } from './hook.ts'
import type { ZoneObject } from './index.ts'
import { createHook } from './hook.ts'

export const upsertZone: Hook<ZoneObject> = createHook()
export const deleteZone: Hook<ZoneObject> = createHook()
