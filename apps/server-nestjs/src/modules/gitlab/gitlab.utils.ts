import { PaginationRequestOptions, BaseRequestOptions, OffsetPagination } from '@gitbeaker/core'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export function readGitlabCIConfigContent() {
  return readFile(join(__dirname, './files/.gitlab-ci.yml'), 'utf-8')
}

export async function readMirrorScriptContent() {
  return await readFile(join(__dirname, './files/mirror.sh'), 'utf-8')
}

export async function find<T>(generator: AsyncGenerator<T>, predicate: (item: T) => boolean): Promise<T | undefined> {
  for await (const item of generator) {
    if (predicate(item)) return item
  }
  return undefined
}

export async function *offsetPaginate<T>(
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
