import type { PaginationRequestOptions, BaseRequestOptions, OffsetPagination, RepositoryFileExpandedSchema } from '@gitbeaker/core'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export function digestContent(content: string) {
  return createHash('sha256').update(content).digest('hex')
}

export function hasFileContentChanged(file: RepositoryFileExpandedSchema, content: string) {
  return file?.content_sha256 !== digestContent(content)
}

export function readGitlabCIConfigContent() {
  return readFile(join(__dirname, './files/.gitlab-ci.yml'), 'utf-8')
}

export async function readMirrorScriptContent() {
  return await readFile(join(__dirname, './files/mirror.sh'), 'utf-8')
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

export async function* offsetPaginate<T>(
  request: (options: PaginationRequestOptions<'offset'> & BaseRequestOptions<true>) => Promise<{ data: T[], paginationInfo: OffsetPagination }>,
): AsyncGenerator<T> {
  let page: number | null = 1
  while (page !== null) {
    const { data, paginationInfo } = await request({ page, showExpanded: true, pagination: 'offset' })
    for (const item of data) {
      yield item
    }
    page = paginationInfo.next ? paginationInfo.next : null
  }
}

export function daysAgoFromNow(date: Date) {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
}
