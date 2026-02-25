import type { SonarPaging } from './project.js'

export interface PaginatedResult<T> {
  items: T[]
  paging: SonarPaging
}

export async function* iter<T>(
  request: (page: number) => Promise<PaginatedResult<T>>,
): AsyncGenerator<T> {
  let page: number | null = 1
  while (page !== null) {
    const { items, paging } = await request(page)
    for (const item of items) {
      yield item
    }
    if (!items.length || paging.pageIndex * paging.pageSize >= paging.total) {
      page = null
    } else {
      page = paging.pageIndex + 1
    }
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

export function formatGroupName(group: string) {
  if (group.startsWith('/console/')) {
    return `platform-${group.replace('/console/', '')}`
  }
  const projectMatch = group.match(/^\/(.+)\/console\/(.+)$/)
  if (projectMatch) {
    const [, slug, role] = projectMatch
    return `project-${slug}-${role}`
  }
  return group
}
