import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PrismaClient, UserType } from '@prisma/client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { parseFixtureConfig } from '../src/config/fixtures.config'

const PROJECT_ID = '20000000-0000-0000-0000-000000000001'
const OWNER_ROLE_ID = '30000000-0000-0000-0000-000000000001'
const DEV_ROLE_ID = '30000000-0000-0000-0000-000000000002'
// The owner has no member row yet; a past owner holds Propriétaire beside another
// role. The database is already migrated, so the seed must undo the owner row the
// deploy created before the migration under test is replayed.
const OWNER_ID = '10000000-0000-0000-0000-000000000011'
const PAST_OWNER_ID = '10000000-0000-0000-0000-000000000012'
const MIGRATION = resolve(__dirname, '../src/prisma/migrations/20261124162746_add_owner_to_project_members/migration.sql')

// Prisma prepares each raw statement, so a migration file is applied one statement at a time.
function splitSqlStatements(sql: string) {
  return sql.replace(/^--.*$/gm, '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean)
}

describe.skipIf(!process.env.E2E || !process.env.FIXTURES_TEST_DB_URL)('owner backfill migration on PostgreSQL', () => {
  let prisma: PrismaClient

  beforeAll(async () => {
    const config = parseFixtureConfig({ NODE_ENV: 'test', DB_URL: process.env.FIXTURES_TEST_DB_URL }, ['--reset'])
    prisma = new PrismaClient({ datasources: { db: { url: config.dbUrl } } })
  })

  afterAll(async () => {
    await prisma?.$disconnect()
  })

  async function seedPreMigrationState() {
    await prisma.$transaction([
      prisma.projectMembers.deleteMany({ where: { projectId: PROJECT_ID } }),
      prisma.projectRole.deleteMany({ where: { projectId: PROJECT_ID } }),
      prisma.project.deleteMany({ where: { id: PROJECT_ID } }),
      prisma.user.deleteMany({ where: { id: { in: [OWNER_ID, PAST_OWNER_ID] } } }),
      prisma.user.createMany({
        data: [
          { id: OWNER_ID, firstName: 'Owner', lastName: 'Backfill', email: 'owner@example.com', adminRoleIds: [], type: UserType.human },
          { id: PAST_OWNER_ID, firstName: 'Past', lastName: 'Owner', email: 'past-owner@example.com', adminRoleIds: [], type: UserType.human },
        ],
      }),
      prisma.project.create({
        data: {
          id: PROJECT_ID,
          name: 'owner-backfill',
          slug: 'owner-backfill',
          status: 'created',
          hprodCpu: 0,
          hprodGpu: 0,
          hprodMemory: 0,
          prodCpu: 0,
          prodGpu: 0,
          prodMemory: 0,
          owner: { connect: { id: OWNER_ID } },
        },
      }),
      prisma.projectRole.createMany({
        data: [
          {
            id: OWNER_ROLE_ID,
            name: 'Propriétaire',
            permissions: 2n,
            position: 0,
            oidcGroup: '/owner-backfill/console/owner',
            type: 'system:managed',
            projectId: PROJECT_ID,
          },
          {
            id: DEV_ROLE_ID,
            name: 'Développeur',
            permissions: 784n,
            position: 3,
            oidcGroup: '/owner-backfill/console/developer',
            type: 'system:managed',
            projectId: PROJECT_ID,
          },
        ],
      }),
      prisma.projectMembers.createMany({
        data: [
          { projectId: PROJECT_ID, userId: PAST_OWNER_ID, roleIds: [OWNER_ROLE_ID, DEV_ROLE_ID] },
        ],
      }),
    ])
  }

  async function applyMigration() {
    const statements = splitSqlStatements(readFileSync(MIGRATION, 'utf8'))
    expect(statements).toHaveLength(Number(process.env.EXPECT_STATEMENTS ?? 3))
    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement)
    }
  }

  async function rolesOf(userId: string) {
    return new Set((await prisma.projectMembers.findFirstOrThrow({ where: { projectId: PROJECT_ID, userId } })).roleIds)
  }

  it('gives the owner the Propriétaire role and takes it from a past owner, who keeps their other roles', async () => {
    await seedPreMigrationState()

    await applyMigration()

    expect(await rolesOf(OWNER_ID)).toEqual(new Set([OWNER_ROLE_ID]))
    expect(await rolesOf(PAST_OWNER_ID)).toEqual(new Set([DEV_ROLE_ID]))
  })

  it('keeps the roles of an owner who is already a member', async () => {
    await seedPreMigrationState()
    await prisma.projectMembers.create({ data: { projectId: PROJECT_ID, userId: OWNER_ID, roleIds: [DEV_ROLE_ID] } })

    await applyMigration()

    expect(await rolesOf(OWNER_ID)).toEqual(new Set([DEV_ROLE_ID, OWNER_ROLE_ID]))
  })

  it('is idempotent: replaying it changes nothing', async () => {
    await seedPreMigrationState()
    await applyMigration()
    const before = await prisma.projectMembers.findMany({ where: { projectId: PROJECT_ID }, orderBy: { userId: 'asc' } })

    await applyMigration()

    expect(await prisma.projectMembers.findMany({ where: { projectId: PROJECT_ID }, orderBy: { userId: 'asc' } })).toEqual(before)
  })
})
