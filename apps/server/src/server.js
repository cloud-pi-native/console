import app from './app.js'
import { getConnection, closeConnections } from './connect.js'
import { isDev, isTest, isCI, isProd, isDevSetup } from './utils/env.js'

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

  app.log.info('Reading init-db.js')

  try {
    const { initDb } = await import('../dev-setup/init-db.js')
    if (initDb && (isDevSetup || isTest)) {
      app.log.info('Starting init DB...')
      await initDb()
      app.log.info('DB successfully init')
    }
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' || error.message.includes('Failed to load')) {
      app.log.info('No initDb file, skipping')
    } else {
      app.log.warn(error.message)
      throw error
    }
  }

  app.listen({ host: '0.0.0.0', port }, (err, _address) => {
    if (err) {
      app.log.error(err)
      process.exit(1)
    }
  })
  app.log.debug({ isDev, isTest, isCI, isDevSetup, isProd })
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
