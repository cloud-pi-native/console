import { Sequelize } from 'sequelize'
import { setTimeout } from 'node:timers/promises'
import app from './app.js'
import {
  isTest,
  isCI,
  isDev,
  dbHost,
  dbPort,
  dbUser,
  dbName,
  dbPass,
} from './utils/env.js'
import {
  getOrganizationModel,
  getUserModel,
  getProjectModel,
  getEnvironmentModel,
  getPermissionModel,
  getRepositoryModel,
} from './models/models.js'
import { dropPermissionsTable } from './models/permission-queries.js'
import { dropEnvironmentsTable } from './models/environment-queries.js'
import { dropRepositoriesTable } from './models/repository-queries.js'
import { dropProjectsTable } from './models/project-queries2.js'
import { dropUsersTable } from './models/users-queries.js'
import { dropOrganizationsTable } from './models/organization-queries.js'

const DELAY_BEFORE_RETRY = isTest || isCI ? 1000 : 10000
let closingConnections = false

export let sequelize

export const getConnection = async (triesLeft = 5) => {
  if (closingConnections || triesLeft <= 0) {
    throw new Error('Unable to connect to Postgres server')
  }
  triesLeft--

  const postgresUri = `postgres://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${dbName}`

  if (isTest) {
    const { default: SequelizeMock } = await import('sequelize-mock')
    sequelize = new SequelizeMock()
    return
  }
  try {
    if (isDev || isTest || isCI) {
      app.log.info(`Trying to connect to Postgres with: ${postgresUri}`)
    }
    sequelize = new Sequelize(postgresUri)
    await sequelize.authenticate()
    app.log.info('Connected to Postgres!')
  } catch (error) {
    if (triesLeft > 0) {
      app.log.info(`Could not connect to Postgres: ${error.message}`)
      app.log.info(`Retrying (${triesLeft} tries left)`)
      await setTimeout(DELAY_BEFORE_RETRY)
      return getConnection(triesLeft)
    }

    app.log.info(`Could not connect to Postgres: ${error.message}`)
    app.log.info('Out of retries')
    error.message = `Out of retries, last error: ${error.message}`
    throw error
  }
}

export const closeConnections = async () => {
  closingConnections = true
  try {
    await sequelize.close()
  } catch (error) {
    app.log.error(error)
  }
}

export const synchroniseModels = async () => {
  await dropRepositoriesTable()
  await dropPermissionsTable()
  await dropEnvironmentsTable()
  await dropProjectsTable()
  await dropUsersTable()
  await dropOrganizationsTable()
  try {
    const organizationModel = await getOrganizationModel()
    await organizationModel.sync({ alter: true, logging: false })

    const userModel = await getUserModel()
    await userModel.sync({ alter: true, logging: false })

    const projectModel = await getProjectModel()
    projectModel.belongsTo(userModel, { foreignKey: 'ownerId' })
    projectModel.belongsTo(organizationModel, { foreignKey: 'organization' })
    await projectModel.sync({ alter: true, logging: false })

    const environmentModel = await getEnvironmentModel()
    environmentModel.belongsTo(projectModel, { foreignKey: 'projectId' })
    await environmentModel.sync({ alter: true, logging: false })

    const permissionModel = await getPermissionModel()
    permissionModel.belongsTo(userModel, { foreignKey: 'userId' })
    permissionModel.belongsTo(environmentModel, { foreignKey: 'environmentId' })
    await permissionModel.sync({ alter: true, logging: false })

    const repositoryModel = await getRepositoryModel()
    repositoryModel.belongsTo(projectModel, { foreignKey: 'projectId' })
    await repositoryModel.sync({ alter: true, logging: false })
    app.log.info('All models were synchronized successfully.')
  } catch (error) {
    app.log.error('Models synchronisation with database failed.')
  }
}
