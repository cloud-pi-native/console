import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PrismaClientInitializationError } from '@prisma/client/runtime/library.js'
import prisma from './__mocks__/prisma.js'
import app, { logger } from './app.js'
import { getConnection } from './connect.js'

vi.mock('fastify-keycloak-adapter', (await import('./utils/mocks.js')).mockSessionPlugin)
vi.mock('@/resources/queries-index.js')
vi.mock('./models/log.js', () => getModel('getLogModel'))
vi.mock('./models/repository.js', () => getModel('getRepositoryModel'))
vi.mock('./models/permission.js', () => getModel('getPermissionModel'))
vi.mock('./models/environment.js', () => getModel('getEnvironmentModel'))
vi.mock('./models/project.js', () => getModel('getProjectModel'))
vi.mock('./models/user.js', () => getModel('getUserModel'))
vi.mock('./models/users-projects.js', () => getModel('getRolesModel'))
vi.mock('./models/organization.js', () => getModel('getOrganizationModel'))
vi.mock('./models/zone.js', () => getModel('getZoneModel'))
vi.mock('./models/system-setting.js', () => getModel('getSystemSetting'))
vi.mock('./prisma.js')

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
