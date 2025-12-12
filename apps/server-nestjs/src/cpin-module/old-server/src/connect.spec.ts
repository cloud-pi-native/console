import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PrismaClientInitializationError } from '@prisma/client/runtime/library'
import prisma from './__mocks__/prisma'
import app, { logger } from './app'
import { getConnection } from './connect'

vi.mock('fastify-keycloak-adapter', (await import('./utils/mocks')).mockSessionPlugin)
vi.mock('@old-server/resources/queries-index')
vi.mock('./models/log', () => getModel('getLogModel'))
vi.mock('./models/repository', () => getModel('getRepositoryModel'))
vi.mock('./models/permission', () => getModel('getPermissionModel'))
vi.mock('./models/environment', () => getModel('getEnvironmentModel'))
vi.mock('./models/project', () => getModel('getProjectModel'))
vi.mock('./models/user', () => getModel('getUserModel'))
vi.mock('./models/users-projects', () => getModel('getRolesModel'))
vi.mock('./models/zone', () => getModel('getZoneModel'))
vi.mock('./prisma')

vi.spyOn(app, 'listen')
vi.spyOn(logger, 'info')
vi.spyOn(logger, 'warn')
vi.spyOn(logger, 'error')
vi.spyOn(logger, 'debug')

function getModel(modelName) {
  return {
    [modelName]: vi.fn(() => ({
      sync: vi.fn(),
      hasMany: vi.fn(),
      belongsTo: vi.fn(),
      belongsToMany: vi.fn(),
    })),
  }
}

describe('connect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should connect to postgres', async () => {
    await getConnection()

    expect(logger.info.mock.calls).toHaveLength(2)
    expect(logger.info.mock.calls).toContainEqual([`Trying to connect to Postgres with: ${process.env.DB_URL}`])
    expect(logger.info.mock.calls).toContainEqual(['Connected to Postgres!'])
  })

  it('should fail to connect once, then connect to postgres', async () => {
    const errorToCatch = new PrismaClientInitializationError('Failed to connect', '2.19.0', 'P1001')

    prisma.$connect.mockRejectedValueOnce(errorToCatch)
    await getConnection()

    expect(logger.info.mock.calls).toHaveLength(5)
    expect(logger.info.mock.calls).toContainEqual([`Trying to connect to Postgres with: ${process.env.DB_URL}`])
    expect(logger.info.mock.calls).toContainEqual(['Could not connect to Postgres: Failed to connect'])
    expect(logger.info.mock.calls).toContainEqual(['Retrying (4 tries left)'])
    expect(logger.info.mock.calls).toContainEqual(['Connected to Postgres!'])
  })
})
