import { describe, expect, it } from 'vitest'
import { faker } from '@faker-js/faker'
import prisma from '../../__mocks__/prisma'
import { getLogs } from './business.ts'

describe('test log business', () => {
  it('should map filter (clean logs)', async () => {
    const dbLogs = [{
      data: { args: {} },
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: null,
      action: 'Action',
      id: faker.string.uuid(),
    }]
    const query = { limit: 10, offset: 10, clean: true, projectId: undefined }
    prisma.$transaction.mockResolvedValueOnce([dbLogs.length, dbLogs])
    const [_total, logs] = await getLogs(query)

    expect(logs[0]).not.haveOwnProperty('requestId')
    expect(logs[0].data).not.haveOwnProperty('results')
    expect(logs[0].data).not.haveOwnProperty('args')
    expect(logs[0].data).not.haveOwnProperty('config')
  })

  it('should not filter (admin logs)', async () => {
    const dbLogs = [{
      data: { args: {} },
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: null,
      action: 'Action',
      id: faker.string.uuid(),
    }]
    const query = { limit: 10, offset: 10, clean: false, projectId: undefined }
    prisma.$transaction.mockResolvedValueOnce([dbLogs.length, dbLogs])
    const [_total, logs] = await getLogs(query)

    expect(logs[0].data).haveOwnProperty('args')
    expect(logs[0].data).not.haveOwnProperty('config')
  })
})
