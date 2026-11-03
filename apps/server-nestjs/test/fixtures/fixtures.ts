import { PrismaClient } from '@prisma/client'
import { data } from '../../../../packages/test-utils/src/imports/data.ts'
import { replaceFixtures } from './fixtures-queries.utils.ts'
import { parseFixtureConfig, parseFixtures } from './fixtures.utils.ts'

async function main(): Promise<void> {
  // Refuse unsafe invocations before creating a client or touching the database.
  // DB_URL is explicit: this command never loads a potentially production .env.
  const config = parseFixtureConfig(process.env, process.argv.slice(2))
  const fixtures = parseFixtures(data)
  const prisma = new PrismaClient({ datasources: { db: { url: config.dbUrl } } })

  try {
    await prisma.$transaction(tx => replaceFixtures(tx, fixtures), { timeout: 30000 })
    process.stdout.write('Development/test fixtures reset successfully\n')
  } finally {
    await prisma.$disconnect()
  }
}

void main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
