import type { ServiceInfos } from '../services.js'
import { DEFAULT, DISABLED, ENABLED } from '@cpn-console/shared'

export class PluginApi { }

export function objectEntries<Obj extends Record<string, unknown>>(obj: Obj): ([keyof Obj, Obj[keyof Obj]])[] {
  return Object.entries(obj) as ([keyof Obj, Obj[keyof Obj]])[]
}
export function objectKeys<Obj extends Record<string, unknown>>(obj: Obj): (keyof Obj)[] {
  return Object.keys(obj) as (keyof Obj)[]
}
export function objectValues<Obj extends Record<string, unknown>>(obj: Obj): (Obj[keyof Obj])[] {
  return Object.values(obj) as (Obj[keyof Obj])[]
}

type ConfigScope = keyof Required<ServiceInfos>['config']

export type DeclareModuleGenerator<Infos extends ServiceInfos & Pick<Required<ServiceInfos>, 'config'>, Scope extends ConfigScope> = {
  [K in Infos['name']]?: {
    [P in Infos['config'][Scope][number]['key']]?: string
  }
}

export const enabledOrDefaultOrNullish = (value?: string) => !value || [ENABLED, DEFAULT].includes(value)
export const specificallyDisabled = (value?: string) => value === DISABLED
export const specificallyEnabled = (value?: string) => value === ENABLED
export const defaultOrNullish = (value?: string) => !value || DEFAULT === value
export const disabledOrDefault = (value?: string) => value && [DISABLED, DEFAULT].includes(value)
