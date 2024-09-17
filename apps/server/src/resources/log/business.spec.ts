import { describe, expect, it } from 'vitest'
import prisma from '../../__mocks__/prisma.js'
import { getLogs } from './business.ts'

describe('test log business', () => {
  it('should map filter', async () => {
    const query = { limit: 10, offset: 10 }
    prisma.log.findMany.mockResolvedValueOnce([])
    await getLogs(query)
    expect(prisma.log.findMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'desc' }, skip: query.offset, take: query.limit })
  })
})
