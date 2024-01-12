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
