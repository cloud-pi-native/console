import { setTimeout } from 'node:timers/promises'
import prisma from './prisma.js'
import app from './app.js'
import {
  isTest,
  isCI,
  isDev,
  dbUrl,
} from './utils/env.js'
import {
  _dropEnvironmentsTable,
  _dropRepositoriesTable,
  _dropProjectsTable,
  _dropUsersTable,
  _dropOrganizationsTable,
  _dropRolesTable,
  _dropLogsTable,
  _dropClusterTable,
  _dropPermissionsTable,
  _dropKubeconfigTable,
  _dropQuotaTable,
  _dropStageTable,
} from './resources/queries-index.js'

const DELAY_BEFORE_RETRY = isTest || isCI ? 1000 : 10000
let closingConnections = false

export const getConnection = async (triesLeft = 5) => {
  if (closingConnections || triesLeft <= 0) {
    throw new Error('Unable to connect to Postgres server')
  }
  triesLeft--

  try {
    if (isDev || isTest || isCI) {
      app.log.info(`Trying to connect to Postgres with: ${dbUrl}`)
    }
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
    await _dropClusterTable()
    await _dropKubeconfigTable()
    await _dropQuotaTable()
    await _dropStageTable()

    app.log.info('All tables were droped successfully.')
  } catch (error) {
    app.log.error(error)
    app.log.error('Drop database tables failed.')
  }
}
