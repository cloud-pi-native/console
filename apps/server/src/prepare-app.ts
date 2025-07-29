import { rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isCI, isDev, isDevSetup, isInt, isProd, isTest, port } from './utils/env'
import app, { logger } from './app'
import { getConnection } from './connect'
import { initDb } from './init/db/index'
import { initPm } from './plugins'

// Workaround because fetch isn't using http_proxy variables
// See. https://github.com/gajus/global-agent/issues/52#issuecomment-1134525621
if (process.env.HTTP_PROXY) {
  const Undici = await import('undici')
  const ProxyAgent = Undici.ProxyAgent
  const setGlobalDispatcher = Undici.setGlobalDispatcher
  setGlobalDispatcher(
    new ProxyAgent(process.env.HTTP_PROXY),
  )
}

async function initializeDB(path: string) {
  logger.info('Starting init DB...')
  const { data } = await import(path)
  await initDb(data)
  logger.info('initDb invoked successfully')
}

export async function startServer(defaultPort: number = (port ? +port : 8080)) {
  try {
    await getConnection()
  } catch (error) {
    if (!(error instanceof Error)) return
    logger.error(error.message)
    throw error
  }

  initPm()

  logger.info('Reading init database file')

  try {
    const dataPath = (isProd || isInt)
      ? './init/db/imports/data'
      : '@cpn-console/test-utils/src/imports/data.ts'
    await initializeDB(dataPath)
    if (isProd && !isDevSetup) {
      logger.info('Cleaning up imported data file...')
      const __filename = fileURLToPath(import.meta.url)
      const __dirname = dirname(__filename)
      await rm(resolve(__dirname, dataPath))
      logger.info(`Successfully deleted '${dataPath}'`)
    }
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' || error.message.includes('Failed to load') || error.message.includes('Cannot find module')) {
      logger.info('No initDb file, skipping')
    } else {
      logger.warn(error.message)
      throw error
    }
  }

  try {
    await app.listen({ host: '0.0.0.0', port: defaultPort ?? 8080 })
  } catch (error) {
    logger.error(error)
    process.exit(1)
  }
  logger.debug({ isDev, isTest, isCI, isDevSetup, isProd })
}

export async function getPreparedApp() {
  try {
    await getConnection()
  } catch (error) {
    logger.error(error.message)
    throw error
  }

  initPm()

  logger.info('Reading init database file')

  try {
    const dataPath = (isProd || isInt)
      ? './init/db/imports/data'
      : '@cpn-console/test-utils/src/imports/data.ts'
    await initializeDB(dataPath)
    if (isProd && !isDevSetup) {
      logger.info('Cleaning up imported data file...')
      const __filename = fileURLToPath(import.meta.url)
      const __dirname = dirname(__filename)
      await rm(resolve(__dirname, dataPath))
      logger.info(`Successfully deleted '${dataPath}'`)
    }
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' || error.message.includes('Failed to load') || error.message.includes('Cannot find module')) {
      logger.info('No initDb file, skipping')
    } else {
      logger.warn(error.message)
      throw error
    }
  }

  logger.debug({ isDev, isTest, isCI, isDevSetup, isProd })
  return app
}
