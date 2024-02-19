import { vi, describe, it, expect, beforeEach } from 'vitest'
import { dropTables, getConnection } from './connect.js'
import {
  _dropLogsTable,
  _dropRepositoriesTable,
  _dropPermissionsTable,
  _dropEnvironmentsTable,
  _dropProjectsTable,
  _dropUsersTable,
  _dropRolesTable,
  _dropOrganizationsTable,
} from '@/resources/queries-index.js'
import prisma from './__mocks__/prisma.js'
import app from './__mocks__/app.js'
import { PrismaClientInitializationError } from '@prisma/client/runtime/library.js'

vi.mock('@/resources/queries-index.js')
vi.mock('./models/log.js', () => getModel('getLogModel'))
vi.mock('./models/repository.js', () => getModel('getRepositoryModel'))
vi.mock('./models/permission.js', () => getModel('getPermissionModel'))
vi.mock('./models/environment.js', () => getModel('getEnvironmentModel'))
vi.mock('./models/project.js', () => getModel('getProjectModel'))
vi.mock('./models/user.js', () => getModel('getUserModel'))
vi.mock('./models/users-projects.js', () => getModel('getRolesModel'))
vi.mock('./models/organization.js', () => getModel('getOrganizationModel'))
vi.mock('./app.js')
vi.mock('./prisma.js')

function getModel (modelName) {
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

  it('Should drop database tables without error', async () => {
    await dropTables()

    expect(_dropLogsTable.mock.calls).toHaveLength(1)
    expect(_dropRepositoriesTable.mock.calls).toHaveLength(1)
    expect(_dropPermissionsTable.mock.calls).toHaveLength(1)
    expect(_dropEnvironmentsTable.mock.calls).toHaveLength(1)
    expect(_dropProjectsTable.mock.calls).toHaveLength(1)
    expect(_dropUsersTable.mock.calls).toHaveLength(1)
    expect(_dropRolesTable.mock.calls).toHaveLength(1)
    expect(_dropOrganizationsTable.mock.calls).toHaveLength(1)
    expect(app.log.info.mock.calls).toHaveLength(1)
  })

  it('Should drop database tables with error', async () => {
    _dropLogsTable.mockRejectedValueOnce()

    await dropTables()

    expect(_dropLogsTable.mock.calls).toHaveLength(1)
    expect(app.log.error.mock.calls).toHaveLength(2)
    expect(app.log.error.mock.calls).toContainEqual(['Drop database tables failed.'])
  })

  it('Should connect to postgres', async () => {
    await getConnection()

    expect(app.log.info.mock.calls).toHaveLength(2)
    expect(app.log.info.mock.calls).toContainEqual([`Trying to connect to Postgres with: ${process.env.DB_URL}`])
    expect(app.log.info.mock.calls).toContainEqual(['Connected to Postgres!'])
  })

  it('Should fail to connect once, then connect to postgres', async () => {
    const errorToCatch = new PrismaClientInitializationError('Failed to connect', '2.19.0', 'P1001')

    prisma.$connect.mockRejectedValueOnce(errorToCatch)
    await getConnection()

    expect(app.log.info.mock.calls).toHaveLength(5)
    expect(app.log.info.mock.calls).toContainEqual([`Trying to connect to Postgres with: ${process.env.DB_URL}`])
    expect(app.log.info.mock.calls).toContainEqual(['Could not connect to Postgres: Failed to connect'])
    expect(app.log.info.mock.calls).toContainEqual(['Retrying (4 tries left)'])
    expect(app.log.info.mock.calls).toContainEqual(['Connected to Postgres!'])
  })
})
