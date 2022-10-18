import Pool from 'pg-pool'
import { setTimeout } from 'node:timers/promises'
import { isTest, isCI, isProd } from './utils/env.js'
import app from './app.js'

const DELAY_BEFORE_RETRY = isTest || isCI ? 5 : 2000
let closingConnections = false
let pool

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
  const pgConfig = {
    host: dbHost,
    port: dbPort,
    database: dbName,
    user: dbUser,
    password: dbPasswd,
  }

  pool = new Pool(pgConfig)

  try {
    if (!isProd) {
      app.log.info(`Trying to connect to Postgres with: ${JSON.stringify(pgConfig)}`)
    }
    await pool.connect()
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

export const query = (text, params, callback) => {
  return pool.query(text, params, callback)
}

export const closeConnections = async () => {
  closingConnections = true
  try {
    await pool.end()
  } catch (error) {
    app.log.error(error)
  }
}
