import { PrismaClient } from '@prisma/client'
import { parseFixtureConfig, resetFixtures } from './fixtures-testing.utils.ts'

async function main(): Promise<void> {
  const { dbUrl } = parseFixtureConfig(process.env, process.argv.slice(2))
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } })

  try {
    await resetFixtures(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

void main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
