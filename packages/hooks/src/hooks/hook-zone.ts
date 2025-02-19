import type { Hook } from './hook.js'
import { createHook } from './hook.js'
import type { ZoneObject } from './index.js'

export const upsertZone: Hook<ZoneObject> = createHook()
export const deleteZone: Hook<ZoneObject> = createHook()
