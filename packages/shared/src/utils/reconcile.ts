// Set vocabulary keeps desired and keep as keys, so one convergence rule
// serves every reconcile loop without a second identity predicate.
export function additionSet(current: ReadonlySet<string>, desired: ReadonlySet<string>): ReadonlySet<string> {
  return new Set([...desired].filter(key => !current.has(key)))
}

export function evictionSet(current: ReadonlySet<string>, keep: ReadonlySet<string>): ReadonlySet<string> {
  return new Set([...current].filter(key => !keep.has(key)))
}

export async function reconcile<T>({
  current,
  desired,
  keep = new Set<string>(),
  keyOf,
  add,
  remove,
}: {
  current: T[]
  desired: ReadonlySet<string>
  keep?: ReadonlySet<string>
  keyOf: (item: T) => string | undefined
  add: (key: string) => Promise<void>
  remove: (item: T) => Promise<void>
}): Promise<void> {
  const currentKeys = new Set(current.map(keyOf).filter((key): key is string => key !== undefined))
  const evict = evictionSet(currentKeys, new Set([...desired, ...keep]))
  await Promise.all([
    ...[...additionSet(currentKeys, desired)].map(key => add(key)),
    ...current
      .filter((item) => {
        const key = keyOf(item)
        return key !== undefined && evict.has(key)
      })
      .map(item => remove(item)),
  ])
}
