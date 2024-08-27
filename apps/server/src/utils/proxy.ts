// @ts-nocheck un enfer à typer, pour plus tard
type Tracker<T extends Record<string, any>> = Record<keyof T, Record<string, {
  currentExec?: Promise<any>
  nextArgs?: [string]
}>> | Promise<any>

type Target = Record<string, (id?: string, args?: object) => Promise<any>>
type Excludes<T extends Target> = Partial<Record<keyof T, Array<keyof T>>> | undefined
const toTarget = <T extends Target>(target: T) => ({ tracker: {} as Tracker<T>, methods: target })

// @ts-ignore
export function genericProxy<T>(proxied: T, excludes: Excludes<T> = {}): T {
  return new Proxy(toTarget(proxied), {
    get({ methods, tracker }, property: string) {
      if (!(property in methods)) return
      return async (...args) => {
        const id = args[0] as string

        if (!id && args.length > 0) {
          throw new Error('ID is required when args are provided')
        }

        if (!id) {
          if (tracker[property] instanceof Promise) {
            return tracker[property]
          }
          const p = methods[property]()
          if (p instanceof Promise) {
            tracker[property] = p
            p.then(() => {
              delete tracker[property]
            })
          }
          return p
        }
        if (!tracker[property]) {
          tracker[property] = {}
        }

        for (const testExclude of excludes[property] ?? []) {
        // @ts-ignore
          if (tracker?.[testExclude]?.[id]?.currentExec) {
            throw new Error(`${String(testExclude)} in progress on ${id}, can't ${String(property)}`)
          }
        }

        if (id in tracker[property]) {
          if (args[1]) {
            tracker[property][id].nextArgs = {
              ...(tracker[property][id].nextArgs ?? {}),
              ...args[1],
            }
          }
          if (tracker[property][id].currentExec) {
            return new Promise((resolve) => {
              tracker[property][id].currentExec.then(() => {
                resolve(tracker[property][id].currentExec ?? methods[property](id, tracker[property][id].nextArgs))
              })
            })
          }
        }
        const p = methods[property](...args)
        tracker[property][id] = {
          currentExec: p,
          nextArgs: undefined,
        }
        tracker[property][id].currentExec = p
        p.then(() => {
          tracker[property][id].currentExec = undefined
        })
        return p
      }
    },
    set() {
      return false
    },
  }) as T
}
