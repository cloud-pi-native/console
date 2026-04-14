import type { GitlabListResponse, OffsetPagination } from './types.js'

export function parseOffsetPagination(headers: Headers): OffsetPagination {
  const nextPage = headers.get('x-next-page')
  if (!nextPage) return { next: null }
  const parsed = Number(nextPage)
  return { next: Number.isFinite(parsed) && parsed > 0 ? parsed : null }
}

export async function* offsetPaginate<T>(
  request: (options: { page: number, perPage?: number }) => Promise<GitlabListResponse<T>>,
  options?: { startPage?: number, perPage?: number, maxPages?: number },
): AsyncGenerator<T> {
  let page: number | null = options?.startPage ?? 1
  let pagesFetched = 0

  while (page !== null) {
    if (options?.maxPages && pagesFetched >= options.maxPages) break
    const { data, paginationInfo } = await request({ page, perPage: options?.perPage })
    pagesFetched += 1
    for (const item of data) {
      yield item
    }
    page = paginationInfo.next
  }
}

export async function getAll<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = []
  for await (const item of iterable) items.push(item)
  return items
}

export async function find<T>(
  iterable: AsyncIterable<T>,
  predicate: (item: T) => boolean,
): Promise<T | undefined> {
  for await (const item of iterable) {
    if (predicate(item)) return item
  }
  return undefined
}
