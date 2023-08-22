import { vi, describe, it, expect, beforeEach } from 'vitest'
import { dropTables, synchroniseModels } from './connect.js'
import {
  _dropLogsTable,
  _dropRepositoriesTable,
  _dropPermissionsTable,
  _dropEnvironmentsTable,
  _dropProjectsTable,
  _dropUsersTable,
  _dropRolesTable,
  _dropOrganizationsTable
} from '@/resources/queries-index.js'
import app from './app.js'

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

describe.skip('connect', () => {
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
    expect(app.log.error.mock.calls).toHaveLength(1)
  })

  it('Should synchronise database with models without error', async () => {
    await synchroniseModels()

    expect(getLogModel.mock.calls).toHaveLength(1)
    expect(getOrganizationModel.mock.calls).toHaveLength(1)
    expect(getUserModel.mock.calls).toHaveLength(1)
    expect(getProjectModel.mock.calls).toHaveLength(1)
    expect(getEnvironmentModel.mock.calls).toHaveLength(1)
    expect(getPermissionModel.mock.calls).toHaveLength(1)
    expect(getRepositoryModel.mock.calls).toHaveLength(1)
    expect(getRolesModel.mock.calls).toHaveLength(1)
    expect(app.log.info.mock.calls).toHaveLength(1)
  })

  it('Should synchronise database with models with error', async () => {
    getLogModel.mockRejectedValueOnce()

    await synchroniseModels()

    expect(getLogModel.mock.calls).toHaveLength(1)
    expect(app.log.error.mock.calls).toHaveLength(1)
  })
})
