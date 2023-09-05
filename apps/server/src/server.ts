import { isDev, isTest, isCI, isProd, isDevSetup, port, isInt } from './utils/env.js'
import { rm } from 'node:fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import app from './app.js'
import { getConnection, closeConnections } from './connect.js'
import { initDb } from './init/db/index.js'
import { initCorePlugins, initExternalPlugins, initPluginManager } from './plugins/index.js'

await startServer()
handleExit()

async function initializeDB (path: string) {
  app.log.info('Starting init DB...')
  const { data } = await import(path)
  await initDb(data)
  app.log.info('initDb invoked successfully')
}

export async function startServer () {
  if ((isInt || isProd) && !isCI) { // execute only when in real prod env and local dev integration
    const pluginManager = await initPluginManager(app)
    await initCorePlugins(pluginManager, app)
    await initExternalPlugins(pluginManager, app)
  }

  try {
    await getConnection()
  } catch (error) {
    app.log.error(error.message)
    throw error
  }

  app.log.info('Reading init database file')

  try {
    const dataPath = (isProd || isInt)
      ? './init/db/imports/data.js'
      : '@dso-console/test-utils/src/imports/data.ts'

    await initializeDB(dataPath)
    if (isProd && !isDevSetup) {
      app.log.info('Cleaning up imported data file...')
      const __filename = fileURLToPath(import.meta.url)
      const __dirname = dirname(__filename)
      await rm(resolve(__dirname, dataPath))
      app.log.info(`Successfully deleted '${dataPath}'`)
    }
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' || error.message.includes('Failed to load') || error.message.includes('Cannot find module')) {
      app.log.info('No initDb file, skipping')
    } else {
      app.log.warn(error.message)
      throw error
    }
  }

  try {
    await app.listen({ host: '0.0.0.0', port: +port })
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
  app.log.debug({ isDev, isTest, isCI, isDevSetup, isProd })

  process.on('unhandledRejection', (err: Error) => {
    app.log.warn(err)
    process.exit(1)
  })
}

export function handleExit () {
  process.on('exit', exitGracefully)
  process.on('SIGINT', exitGracefully)
  process.on('SIGTERM', exitGracefully)
  process.on('uncaughtException', exitGracefully)
}

export async function exitGracefully (error: Error) {
  if (error instanceof Error) {
    app.log.error(error)
  }
  app.log.info('Closing connections...')
  await closeConnections()
  app.log.info('Exiting...')
  process.exit(error instanceof Error ? 1 : 0)
}
