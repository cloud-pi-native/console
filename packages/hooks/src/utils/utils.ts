import { DEFAULT, DISABLED, ENABLED } from '@cpn-console/shared'
export class PluginApi { }

export const objectEntries = <Obj extends Record<string, unknown>>(obj: Obj): ([keyof Obj, Obj[keyof Obj]])[] => {
  return Object.entries(obj) as ([keyof Obj, Obj[keyof Obj]])[]
}
export const objectKeys = <Obj extends Record<string, unknown>>(obj: Obj): (keyof Obj)[] => {
  return Object.keys(obj) as (keyof Obj)[]
}
export const objectValues = <Obj extends Record<string, unknown>>(obj: Obj): (Obj[keyof Obj])[] => {
  return Object.values(obj) as (Obj[keyof Obj])[]
}

export const enabledOrDefaultOrNullish = (value?: string) => !value || [ENABLED, DEFAULT].includes(value)
export const specificallyDisabled = (value?: string) => value === DISABLED
export const specificallyEnabled = (value?: string) => value === ENABLED
export const defaultOrNullish = (value?: string) => !value || DEFAULT === value
export const disabledOrDefault = (value?: string) => value && [DISABLED, DEFAULT].includes(value)
