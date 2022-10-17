import { createServer } from 'http'
import fs from 'fs'
import app from './app.js'
import { getConnection, closeConnections } from './connect.js'
import { techLogger } from './utils/logger.js'
import { isDev, isTest, isProd } from './utils/env.js'

const port = process.env.SERVER_PORT

startServer()
handleExit()

export async function startServer () {
  try {
    await getConnection()
  } catch (error) {
    techLogger.error(error.message)
    throw error
  }

  techLogger.info('server connected to postgres, reading init-db.js')

  try {
    // const { initDb } = await import('../dev-setup/init-db.js')
    const initDb = false
    if (initDb) {
      techLogger.info('Starting init DB...')
      await initDb()
      techLogger.info('DB successfully init')
    }
    if (isProd && initDb) {
      techLogger.info('Cleaning up init file...')
      await new Promise((resolve, reject) => {
        fs.unlink('./dev-setup/init-db.js', (err) => {
          if (err) return reject(err)
          techLogger.info('Successfully deleted ../dev-setup/init-db.js')
          resolve()
        })
      })
    }
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' || error.message.startsWith('Cannot find module')) {
      techLogger.info('No initDb file, skipping')
    } else {
      techLogger.warn(error.message)
      throw error
    }
  }

  createServer(app).listen(port, '0.0.0.0')
  techLogger.info(`server running at http://localhost:${port}`)
  techLogger.debug({ isDev, isTest, isProd })
}

export function handleExit () {
  process.on('exit', exitGracefuly)
  process.on('SIGINT', exitGracefuly)
  process.on('SIGTERM', exitGracefuly)
  process.on('uncaughtException', exitGracefuly)
}

export async function exitGracefuly (error) {
  if (error instanceof Error) {
    techLogger.error(error)
  }
  techLogger.info('Closing connections...')
  await closeConnections()
  techLogger.info('Exiting...')
  process.exit(error instanceof Error ? 1 : 0)
}