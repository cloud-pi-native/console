import { logger } from '@cpn-console/logger'
import { PrismaClientInitializationError } from '@prisma/client/runtime/library.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import prisma from './__mocks__/prisma.js'
import app from './app.js'
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
vi.mock('./models/zone.js', () => getModel('getZoneModel'))
vi.mock('./prisma.js')

vi.spyOn(app, 'listen')
const infoSpy = vi.spyOn(logger, 'info')
const errorSpy = vi.spyOn(logger, 'error')
const debugSpy = vi.spyOn(logger, 'debug')

function getModel(modelName: string) {
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

    expect(debugSpy.mock.calls).toHaveLength(1)
    expect(debugSpy.mock.calls[0]?.[1]).toBe('Connecting to Postgres')

    expect(infoSpy.mock.calls).toHaveLength(1)
    expect(infoSpy.mock.calls).toContainEqual(['Connected to Postgres!'])
  })

  it('should fail to connect once, then connect to postgres', async () => {
    const errorToCatch = new PrismaClientInitializationError('Failed to connect', '2.19.0', 'P1001')

    prisma.$connect.mockRejectedValueOnce(errorToCatch)
    await getConnection()

    expect(errorSpy.mock.calls).toHaveLength(1)
    expect(errorSpy.mock.calls[0]?.[1]).toBe('Could not connect to Postgres')

    expect(infoSpy.mock.calls).toHaveLength(2)
    expect(infoSpy.mock.calls[0]?.[1]).toBe('Retrying Postgres connection')
    expect(infoSpy.mock.calls).toContainEqual(['Connected to Postgres!'])

    expect(debugSpy.mock.calls).toHaveLength(2)
    expect(debugSpy.mock.calls[0]?.[1]).toBe('Connecting to Postgres')
    expect(debugSpy.mock.calls[1]?.[1]).toBe('Connecting to Postgres')
  })
})
