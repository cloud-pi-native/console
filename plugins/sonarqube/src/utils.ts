import type { SonarPaging } from './project.js'

export interface PaginatedResult<T> {
  items: T[]
  paging: SonarPaging
}

export interface IteratorOptions {
  pageSize?: number
}

export async function* iter<T>(
  request: (page: number, pageSize: number) => Promise<PaginatedResult<T>>,
  options: IteratorOptions = {},
): AsyncGenerator<T> {
  const pageSize = options.pageSize ?? 100
  let page = 1
  for (;;) {
    const { items, paging } = await request(page, pageSize)
    for (const item of items) {
      yield item
    }
    if (!items.length || paging.pageIndex * paging.pageSize >= paging.total) {
      break
    }
    page += 1
  }
}

export async function getAll<T>(
  iterable: AsyncIterable<T>,
): Promise<T[]> {
  const result: T[] = []
  for await (const item of iterable) {
    result.push(item)
  }
  return result
}

export async function find<T>(
  iterable: AsyncIterable<T>,
  predicate: (item: T) => boolean,
): Promise<T | undefined> {
  for await (const item of iterable) {
    if (predicate(item)) {
      return item
    }
  }
  return undefined
}
