import type { Prisma, PrismaClient } from '@prisma/client'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { loadFixtures, resetFixtures } from './fixtures-testing.utils'

describe('loadFixtures', () => {
  it('loads fresh typed fixtures without sharing mutable rows', () => {
    const fixtures = loadFixtures()
    const originalOwnerId = fixtures.project[0].ownerId
    fixtures.project[0].ownerId = '00000000-0000-0000-0000-000000000000'

    expect(loadFixtures().project[0].ownerId).toBe(originalOwnerId)
    expect(fixtures.adminRole[0].permissions).toBe(3n)
    expect(fixtures.adminToken[0].status).toBe('active')
    expect(fixtures.adminToken[1].status).toBe('revoked')
  })
})

describe('resetFixtures', () => {
  let prisma: DeepMockProxy<PrismaClient>
  let tx: DeepMockProxy<Prisma.TransactionClient>

  beforeEach(() => {
    prisma = mockDeep<PrismaClient>()
    tx = mockDeep<Prisma.TransactionClient>()
    prisma.$transaction.mockImplementation(async callback => callback(tx))
  })

  it('imports the versioned dataset in a transaction with typed permissions and enums', async () => {
    const fixtures = loadFixtures()

    await resetFixtures(prisma)

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { timeout: 30000 })
    expect(tx.adminRole.createMany).toHaveBeenCalledWith({ data: fixtures.adminRole })
    expect(tx.adminToken.createMany).toHaveBeenCalledWith({ data: fixtures.adminToken })
    expect(tx.project.createMany).toHaveBeenCalledWith({ data: fixtures.project })
    expect(tx.log.createMany).toHaveBeenCalledWith({ data: fixtures.log })
    expect(fixtures.adminRole[0].permissions).toBe(3n)
    expect(fixtures.adminToken[0].status).toBe('active')
    expect(fixtures.adminToken[1].status).toBe('revoked')
    expect(fixtures.project[0].everyonePerms).toBe(768n)
  })

  it('respects foreign keys and restores cluster associations', async () => {
    await resetFixtures(prisma)

    expect(tx.projectRole.deleteMany).toHaveBeenCalledBefore(tx.project.deleteMany)
    expect(tx.projectMembers.deleteMany).toHaveBeenCalledBefore(tx.project.deleteMany)
    expect(tx.project.deleteMany).toHaveBeenCalledBefore(tx.user.deleteMany)
    expect(tx.user.createMany).toHaveBeenCalledBefore(tx.project.createMany)
    expect(tx.project.createMany).toHaveBeenCalledBefore(tx.projectRole.createMany)
    expect(tx.cluster.update).toHaveBeenCalledTimes(8)
    expect(tx.cluster.update).toHaveBeenCalledWith({
      where: { id: '126ac57f-263c-4463-87bb-d4e9017056b2' },
      data: { projects: { connect: [
        { id: '011e7860-04d7-461f-912d-334c622d38b3' },
        { id: '83833faf-f654-40dd-bcd5-cf2e944fc702' },
      ] } },
    })
  })

  it('propagates import errors through the transaction callback', async () => {
    const error = new Error('invalid ownerId')
    tx.project.createMany.mockRejectedValueOnce(error)

    await expect(resetFixtures(prisma)).rejects.toBe(error)
    expect(tx.projectRole.createMany).not.toHaveBeenCalled()
    expect(tx.cluster.update).not.toHaveBeenCalled()
  })
})
