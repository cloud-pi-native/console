import { Sequelize } from 'sequelize'
import { setTimeout } from 'node:timers/promises'
import { isTest, isCI, isDev } from './utils/env.js'
import app from './app.js'

const DELAY_BEFORE_RETRY = isTest || isCI ? 1000 : 10000
let closingConnections = false

export let sequelize

export const getConnection = async (triesLeft = 5) => {
  if (closingConnections || triesLeft <= 0) {
    throw new Error('Unable to connect to Postgres server')
  }
  triesLeft--

  const dbHost = process.env.DB_HOST
  const dbPort = process.env.DB_PORT
  const dbUser = process.env.DB_USER
  const dbPasswd = process.env.DB_PASS
  const dbName = process.env.DB_NAME
  const postgresUri = `postgres://${dbUser}:${dbPasswd}@${dbHost}:${dbPort}/${dbName}`

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
