import type { Hook } from './hook.js'
import type { ZoneObject } from './index.js'
import { createHook } from './hook.js'

export const upsertZone: Hook<ZoneObject> = createHook()
export const deleteZone: Hook<ZoneObject> = createHook()
