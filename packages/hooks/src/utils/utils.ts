import { DEFAULT, DISABLED, ENABLED } from '@cpn-console/shared'
import type { ServiceInfos } from '../services'

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

export const enabledOrDefaultOrNullish = (value?: string): boolean | undefined => value ? [ENABLED, DEFAULT].includes(value) : true
export const disabledOrDefaultOrNullish = (value?: string): boolean | undefined => value ? [DISABLED, DEFAULT].includes(value) : true
export const specificallyDisabled = (value?: string): boolean | undefined => value ? value === DISABLED : undefined
export const specificallyEnabled = (value?: string): boolean | undefined => value ? value === ENABLED : undefined
export const defaultOrNullish = (value?: string): boolean | undefined => value ? DEFAULT === value : true

export const okStatus = { status: { result: 'OK' } } as const

/**
 * Take a list of list of kubernetes resources and ditch duplicates by name
 *
 * @remarks Kind is ignored. You can pass as many arguments as you want
 *
 * @example
 * ```ts
 * const foo = [{ metadata: { name: 'One' }}, { metadata: { name: 'Two' }}]
 * const bar = [{ metadata: { name: 'One' }}, { metadata: { name: 'Three' }}]
 * const xyz = [{ metadata: { name: 'Four' }}, { metadata: { name: 'Two' }}]
 * uniqueResource(foo, bar, xyz)
 * // [
 * //   { metadata: { name: 'One' }},
 * //   { metadata: { name: 'Two' }},
 * //   { metadata: { name: 'Three' }},
 * //   { metadata: { name: 'Four' }}
 * // ]
 * ```
 *
 */
export function uniqueResource<T extends { metadata?: { name?: string } }>(...lists: T[][]): T[] {
  return lists
    .flat()
    .reduce((acc, cur) => (acc.some(item => item.metadata?.name === cur.metadata?.name)
      ? acc
      : [...acc, cur]
    ), [] as T[])
}

export interface BaseResources {
  kind?: string
  apiVersion?: string
  metadata: {
    name?: string
    namespace?: string
    labels: {
      [x: string]: string
    }
    [x: string]: any
  }
  [x: string]: any
}

export interface BareMinimumResource {
  metadata: {
    name: string
    labels: {
      [x: string]: string
    }
  }
}

export interface ListMinimumResources {
  body: {
    items: BareMinimumResource[]
  }
}
