import { vi, describe, it, expect, beforeEach } from 'vitest'
import { dropTables, synchroniseModels } from './connect.js'
import { _dropLogsTable } from './models/queries/log-queries.js'
import { _dropRepositoriesTable } from './models/queries/repository-queries.js'
import { _dropPermissionsTable } from './models/queries/permission-queries.js'
import { _dropEnvironmentsTable } from './models/queries/environment-queries.js'
import { _dropProjectsTable } from './models/queries/project-queries.js'
import { _dropUsersTable } from './models/queries/user-queries.js'
import { _dropUsersProjectsTable } from './models/queries/users-projects-queries.js'
import { _dropOrganizationsTable } from './models/queries/organization-queries.js'
import { getLogModel } from './models/log.js'
import { getRepositoryModel } from './models/repository.js'
import { getPermissionModel } from './models/permission.js'
import { getEnvironmentModel } from './models/environment.js'
import { getProjectModel } from './models/project.js'
import { getUserModel } from './models/user.js'
import { getUsersProjectsModel } from './models/users-projects.js'
import { getOrganizationModel } from './models/organization.js'
import app from './app.js'

vi.mock('./models/queries/log-queries.js')
vi.mock('./models/queries/repository-queries.js')
vi.mock('./models/queries/permission-queries.js')
vi.mock('./models/queries/environment-queries.js')
vi.mock('./models/queries/project-queries.js')
vi.mock('./models/queries/user-queries.js')
vi.mock('./models/queries/users-projects-queries.js')
vi.mock('./models/queries/organization-queries.js')
vi.mock('./models/queries/log-queries.js')
vi.mock('./models/log.js', () => getModel('getLogModel'))
vi.mock('./models/repository.js', () => getModel('getRepositoryModel'))
vi.mock('./models/permission.js', () => getModel('getPermissionModel'))
vi.mock('./models/environment.js', () => getModel('getEnvironmentModel'))
vi.mock('./models/project.js', () => getModel('getProjectModel'))
vi.mock('./models/user.js', () => getModel('getUserModel'))
vi.mock('./models/users-projects.js', () => getModel('getUsersProjectsModel'))
vi.mock('./models/organization.js', () => getModel('getOrganizationModel'))
vi.mock('./app.js')

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
    expect(_dropUsersProjectsTable.mock.calls).toHaveLength(1)
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
    expect(getUsersProjectsModel.mock.calls).toHaveLength(1)
    expect(app.log.info.mock.calls).toHaveLength(1)
  })

  it('Should synchronise database with models with error', async () => {
    getLogModel.mockRejectedValueOnce()

    await synchroniseModels()

    expect(getLogModel.mock.calls).toHaveLength(1)
    expect(app.log.error.mock.calls).toHaveLength(1)
  })
})
