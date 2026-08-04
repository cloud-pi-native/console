import type { Prisma, Repository } from '@prisma/client'
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { PrismaService } from '../infrastructure/database/prisma.service'
import { faker } from '@faker-js/faker'

export function makeRepository(overrides: Partial<Repository> = {}): Repository {
  return {
    id: faker.string.uuid(),
    projectId: faker.string.uuid(),
    internalRepoName: faker.string.alphanumeric(8).toLowerCase(),
    externalRepoUrl: '',
    externalUserName: '',
    isInfra: false,
    isPrivate: false,
    deployRevision: '',
    deployPath: '',
    helmValuesFiles: '',
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    ...overrides,
  }
}

// Repository without an external source: nothing is mirrored.
export function makeInternalRepository(overrides: Partial<Repository> = {}): Repository {
  return makeRepository({
    externalRepoUrl: '',
    externalUserName: '',
    isPrivate: false,
    ...overrides,
  })
}

// Repository mirroring an external source, private by default (hence with credentials).
export function makeExternalRepository(overrides: Partial<Repository> = {}): Repository {
  return makeRepository({
    externalRepoUrl: `https://github.com/${faker.string.alphanumeric(8).toLowerCase()}/${faker.string.alphanumeric(8).toLowerCase()}.git`,
    externalUserName: faker.internet.username().toLowerCase(),
    isPrivate: true,
    ...overrides,
  })
}

function matchesRepositoryWhere(repository: Repository, where?: Prisma.RepositoryWhereInput): boolean {
  if (!where) return true
  if (where.id !== undefined && repository.id !== where.id) return false
  if (where.projectId !== undefined && repository.projectId !== where.projectId) return false
  if (where.internalRepoName !== undefined && repository.internalRepoName !== where.internalRepoName) return false
  return true
}

function sortRepositories(repositories: Repository[], orderBy: unknown): Repository[] {
  if (typeof orderBy !== 'object' || orderBy === null || !('createdAt' in orderBy)) return repositories
  const direction = orderBy.createdAt === 'desc' ? -1 : 1
  return [...repositories].sort((a, b) => direction * (a.createdAt.getTime() - b.createdAt.getTime()))
}

// Prisma delegates return a branded promise, which mock implementations have to mimic.
function prismaPromise<T>(value: T): Prisma.PrismaPromise<T> {
  const promise = Promise.resolve(value)
  return {
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
    [Symbol.toStringTag]: 'PrismaPromise',
  }
}

/**
 * Backs the read queries of the repository table with an in-memory list, so tests can
 * observe what a service returns instead of which arguments it forwards to Prisma.
 * Only the filters and orderings the console actually issues are honoured.
 */
export function stubRepositoryTable(prisma: DeepMockProxy<PrismaService>, getRepositories: () => Repository[]): void {
  prisma.repository.findMany.mockImplementation(args => prismaPromise(
    sortRepositories(getRepositories().filter(repository => matchesRepositoryWhere(repository, args?.where)), args?.orderBy),
  ))

  prisma.repository.count.mockImplementation(args => prismaPromise(
    getRepositories().filter(repository => matchesRepositoryWhere(repository, args?.where)).length,
  ))
}
