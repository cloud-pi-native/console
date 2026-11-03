import type { Prisma } from '@prisma/client'
import { mockDeep } from 'vitest-mock-extended'
import { data } from '../../../../packages/test-utils/src/imports/data'
import { replaceFixtures } from './fixtures-queries.utils'
import { parseFixtures } from './fixtures.utils'

describe('replaceFixtures', () => {
  it('deletes children before parents and inserts parents before children', async () => {
    const tx = mockDeep<Prisma.TransactionClient>()
    const fixtures = parseFixtures(data)

    await replaceFixtures(tx, fixtures)

    expect(tx.projectRole.deleteMany).toHaveBeenCalledBefore(tx.project.deleteMany)
    expect(tx.projectMembers.deleteMany).toHaveBeenCalledBefore(tx.project.deleteMany)
    expect(tx.log.deleteMany).toHaveBeenCalledBefore(tx.project.deleteMany)
    expect(tx.project.deleteMany).toHaveBeenCalledBefore(tx.user.deleteMany)
    expect(tx.deploymentExternalValueSource.deleteMany).toHaveBeenCalledBefore(tx.repository.deleteMany)
    expect(tx.cluster.deleteMany).toHaveBeenCalledBefore(tx.zone.deleteMany)
    expect(tx.user.createMany).toHaveBeenCalledBefore(tx.project.createMany)
    expect(tx.project.createMany).toHaveBeenCalledBefore(tx.projectRole.createMany)
    expect(tx.stage.createMany).toHaveBeenCalledBefore(tx.environment.createMany)
    expect(tx.zone.createMany).toHaveBeenCalledBefore(tx.cluster.createMany)
    expect(tx.cluster.createMany).toHaveBeenCalledBefore(tx.environment.createMany)
    expect(tx.adminRole.createMany).toHaveBeenCalledWith({ data: fixtures.adminRole })
    expect(tx.project.createMany).toHaveBeenCalledWith({ data: fixtures.project })
    expect(tx.log.createMany).toHaveBeenCalledWith({ data: fixtures.log })
  })

  it('restores both project and stage associations on clusters', async () => {
    const tx = mockDeep<Prisma.TransactionClient>()

    await replaceFixtures(tx, parseFixtures(data))

    expect(tx.cluster.update).toHaveBeenCalledTimes(8)
    expect(tx.cluster.update).toHaveBeenCalledWith({
      where: { id: '126ac57f-263c-4463-87bb-d4e9017056b2' },
      data: { projects: { connect: [
        { id: '011e7860-04d7-461f-912d-334c622d38b3' },
        { id: '83833faf-f654-40dd-bcd5-cf2e944fc702' },
      ] } },
    })
    expect(tx.repository.createMany).toHaveBeenCalledBefore(tx.cluster.update)
  })

  it('propagates import errors to roll back the surrounding transaction', async () => {
    const tx = mockDeep<Prisma.TransactionClient>()
    const error = new Error('invalid ownerId')
    tx.project.createMany.mockRejectedValueOnce(error)

    await expect(replaceFixtures(tx, parseFixtures(data))).rejects.toBe(error)

    expect(tx.projectRole.createMany).not.toHaveBeenCalled()
    expect(tx.cluster.update).not.toHaveBeenCalled()
  })
})
