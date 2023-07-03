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
import { _dropPermissionsTable } from './queries/permission-queries.js'
import { _dropEnvironmentsTable } from './queries/environment-queries.js'
import { _dropRepositoriesTable } from './queries/repository-queries.js'
import { _dropProjectsTable } from './queries/project-queries.js'
import { _dropUsersTable } from './queries/user-queries.js'
import { _dropOrganizationsTable } from './queries/organization-queries.js'
import { _dropRolesTable } from './queries/roles-queries.js'
import { _dropLogsTable } from './queries/log-queries.js'

const DELAY_BEFORE_RETRY = isTest || isCI ? 1000 : 10000
let closingConnections = false

export const getConnection = async (triesLeft = 5) => {
  if (closingConnections || triesLeft <= 0) {
    throw new Error('Unable to connect to Postgres server')
  }
  triesLeft--

  try {
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
    await _dropRolesTable()
    await _dropProjectsTable()
    await _dropUsersTable()
    await _dropOrganizationsTable()

    app.log.info('All tables were droped successfully.')
  } catch (error) {
    app.log.error(error)
    app.log.error('Drop database tables failed.')
  }
}
