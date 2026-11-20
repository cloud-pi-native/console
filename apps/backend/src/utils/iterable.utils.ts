export async function* map<T, U>(
  iterable: AsyncIterable<T>,
  mapper: (value: T, index: number) => U | Promise<U>,
): AsyncIterable<U> {
  let index = 0
  for await (const value of iterable) {
    yield await mapper(value, index++)
  }
}

export async function getAll<T>(
  iterable: AsyncIterable<T>,
): Promise<T[]> {
  const items: T[] = []
  for await (const item of iterable) {
    items.push(item)
  }
  return items
}

export async function find<T>(generator: AsyncGenerator<T>, predicate: (item: T) => boolean): Promise<T | undefined> {
  for await (const item of generator) {
    if (predicate(item)) return item
  }
  return undefined
}
