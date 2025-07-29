import type { Hook } from './hook'
import { createHook } from './hook'
import type { ZoneObject } from './index'

export const upsertZone: Hook<ZoneObject> = createHook()
export const deleteZone: Hook<ZoneObject> = createHook()
