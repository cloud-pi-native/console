import { isDev, isTest, isCI, isProd, isDevSetup, port } from './utils/env.js'
import { rm } from 'node:fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import app from './app.js'
import { getConnection, closeConnections, synchroniseModels } from './connect.js'
import { initDb } from './init/db/index.js'
// import { m } from './plugins/index.js'

await startServer()
handleExit()

async function initializeDB (path) {
  app.log.info('Starting init DB...')
  const { data } = await import(path)
  await initDb(data)
  app.log.info('initDb invoked successfully')
}

export async function startServer () {
  try {
    await getConnection()
    await synchroniseModels()
  } catch (error) {
    app.log.error(error.message)
    throw error
  }

  app.log.info('Reading init database file')

  try {
    const dataPath = isProd
      ? './init/db/imports/data.js'
      : 'test-utils/src/imports/data.js'

    // await initializeDB(dataPath)
    if (isProd && !isDevSetup) {
      app.log.info('Cleaning up imported data file...')
      const __filename = fileURLToPath(import.meta.url)
      const __dirname = dirname(__filename)
      await rm(resolve(__dirname, dataPath))
      app.log.info(`Successfully deleted '${dataPath}'`)
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
