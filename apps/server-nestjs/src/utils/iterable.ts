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
