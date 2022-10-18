import fs from 'fs'
import app from './app.js'
import { getConnection, closeConnections } from './connect.js'
import { isDev, isTest, isProd } from './utils/env.js'

const port = process.env.SERVER_PORT

startServer()
handleExit()

export async function startServer () {
  try {
    await getConnection()
  } catch (error) {
    app.log.error(error.message)
    throw error
  }

  app.log.info('server connected to postgres, reading init-db.js')

  try {
    // const { initDb } = await import('../dev-setup/init-db.js')
    const initDb = false
    if (initDb) {
      app.log.info('Starting init DB...')
      await initDb()
      app.log.info('DB successfully init')
    }
    if (isProd && initDb) {
      app.log.info('Cleaning up init file...')
      await new Promise((resolve, reject) => {
        fs.unlink('./dev-setup/init-db.js', (err) => {
          if (err) return reject(err)
          app.log.info('Successfully deleted ../dev-setup/init-db.js')
          resolve()
        })
      })
    }
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' || error.message.startsWith('Cannot find module')) {
      app.log.info('No initDb file, skipping')
    } else {
      app.log.warn(error.message)
      throw error
    }
  }

  app.listen({ host: '0.0.0.0', port }, (err, address) => {
    if (err) {
      app.log.error(err)
      process.exit(1)
    }
  })
  app.log.debug({ isDev, isTest, isProd })
}

export function handleExit () {
  process.on('exit', exitGracefuly)
  process.on('SIGINT', exitGracefuly)
  process.on('SIGTERM', exitGracefuly)
  process.on('uncaughtException', exitGracefuly)
}

export async function exitGracefuly (error) {
  if (error instanceof Error) {
    app.log.error(error)
  }
  app.log.info('Closing connections...')
  await closeConnections()
  app.log.info('Exiting...')
  process.exit(error instanceof Error ? 1 : 0)
}
