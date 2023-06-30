import prisma from './prisma'
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
import { _dropPermissionsTable } from './models/queries/permission-queries.js'
import { _dropEnvironmentsTable } from './models/queries/environment-queries.js'
import { _dropRepositoriesTable } from './models/queries/repository-queries.js'
import { _dropProjectsTable } from './models/queries/project-queries.js'
import { _dropUsersTable } from './models/queries/user-queries.js'
import { _dropOrganizationsTable } from './models/queries/organization-queries.js'
import { _dropUsersProjectsTable } from './models/queries/users-projects-queries.js'
import { _dropLogsTable } from './models/queries/log-queries.js'

const DELAY_BEFORE_RETRY = isTest || isCI ? 1000 : 10000
let closingConnections = false

// export let sequelize
export const getConnection = async (triesLeft = 5) => {
  if (closingConnections || triesLeft <= 0) {
    throw new Error('Unable to connect to Postgres server')
  }
  triesLeft--

  // if (isTest) {
  //   const { default: SequelizeMock } = await import('sequelize-mock')
  //   sequelize = new SequelizeMock()
  //   return
  // }
  try {
    // if (isDev || isTest || isCI) {
    //   app.log.info(`Trying to connect to Postgres with: ${postgresUri}`)
    // }

    await prisma.$connect()

    app.log.info('Connected to Postgres!')
  } catch (error) {
    if (triesLeft > 0) {
      app.log.error(error)
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
    await prisma.$disconnect()
  } catch (error) {
    app.log.error(error)
  } finally {
    closingConnections = false
  }
}

export const dropTables = async () => {
  try {
    await _dropLogsTable()
    await _dropRepositoriesTable()
    await _dropPermissionsTable()
    await _dropEnvironmentsTable()
    await _dropProjectsTable()
    await _dropUsersTable()
    await _dropUsersProjectsTable()
    await _dropOrganizationsTable()

    app.log.info('All tables were droped successfully.')
  } catch (error) {
    app.log.error('Drop database tables failed.')
  }
}
