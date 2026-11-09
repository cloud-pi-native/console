import { data } from '@cpn-console/test-utils'
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { parseFixtureConfig, parseFixtures, resetFixtures } from '../src/prisma/fixtures-testing.utils'

// Opt-in only: this database is disposable and every test resets its contents.
// Enable E2E and apply db:deploy first. Never point FIXTURES_TEST_DB_URL at shared data.
describe.skipIf(!process.env.E2E || !process.env.FIXTURES_TEST_DB_URL)('fixtures on PostgreSQL', () => {
  let prisma: PrismaClient

  beforeAll(() => {
    const config = parseFixtureConfig({ NODE_ENV: 'test', DB_URL: process.env.FIXTURES_TEST_DB_URL }, ['--reset'])
    prisma = new PrismaClient({ datasources: { db: { url: config.dbUrl } } })
  })

  beforeEach(async () => {
    await resetFixtures(prisma)
  })

  afterAll(async () => {
    await prisma?.$disconnect()
  })

  it('imports the dataset, including bigint permissions and relations', async () => {
    expect(await prisma.user.count()).toBe(data.user.length)
    expect(await prisma.project.count()).toBe(data.project.length)
    expect(await prisma.log.count()).toBe(data.log.length)
    expect(await prisma.projectMembers.count()).toBe(data.projectMembers.length)
    expect(await prisma.adminRole.findUniqueOrThrow({ where: { id: data.adminRole[0].id } })).toMatchObject({ permissions: 3n })
    const cluster = await prisma.cluster.findUniqueOrThrow({
      where: { id: '126ac57f-263c-4463-87bb-d4e9017056b2' },
      include: { projects: true, stages: true },
    })
    expect(cluster.projects).toHaveLength(2)
    expect(cluster.stages).toHaveLength(4)
  })

  it('can reset the same database repeatedly without duplicate records', async () => {
    await prisma.project.update({ where: { id: data.project[0].id }, data: { description: 'modified' } })
    await resetFixtures(prisma)

    expect(await prisma.project.count()).toBe(data.project.length)
    expect(await prisma.project.findUniqueOrThrow({ where: { id: data.project[0].id } })).toMatchObject({ description: data.project[0].description })
  })

  it('rolls back deletions, inserts and associations when an import fails', async () => {
    await prisma.project.update({ where: { id: data.project[0].id }, data: { description: 'must survive the failed reset' } })
    const before = await snapshot(prisma)
    const fixtures = parseFixtures(data)
    fixtures.project[0].ownerId = '00000000-0000-0000-0000-000000000000'

    await expect(resetFixtures(prisma, fixtures)).rejects.toThrow()

    expect(await snapshot(prisma)).toEqual(before)
  })
})

async function snapshot(prisma: PrismaClient) {
  return {
    users: await prisma.user.findMany({ orderBy: { id: 'asc' } }),
    projects: await prisma.project.findMany({ orderBy: { id: 'asc' } }),
    members: await prisma.projectMembers.findMany({ orderBy: [{ projectId: 'asc' }, { userId: 'asc' }] }),
    roles: await prisma.projectRole.findMany({ orderBy: { id: 'asc' } }),
    tokens: await prisma.adminToken.findMany({ orderBy: { id: 'asc' } }),
    logs: await prisma.log.findMany({ orderBy: { id: 'asc' } }),
    clusters: await prisma.cluster.findMany({
      orderBy: { id: 'asc' },
      include: { projects: { orderBy: { id: 'asc' } }, stages: { orderBy: { id: 'asc' } } },
    }),
  }
}
