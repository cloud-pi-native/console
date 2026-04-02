import { rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { logger } from '@cpn-console/logger'
import app from './app.js'
import { getConnection } from './connect.js'
import { initDb } from './init/db/index.js'
import { initPm } from './plugins.js'
import { isCI, isDev, isDevSetup, isInt, isProd, isTest, port } from './utils/env.js'

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
    logger.error({ err: error }, 'Database connection failed')
    if (!(error instanceof Error)) return
    throw error
  }

  initPm()

  logger.info('Reading init database file')

  try {
    const dataPath = (isProd || isInt)
      ? './init/db/imports/data.js'
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
    const err = error as any
    if (err?.code === 'ERR_MODULE_NOT_FOUND' || err?.message?.includes('Failed to load') || err?.message?.includes('Cannot find module')) {
      logger.info('No initDb file, skipping')
    } else {
      logger.warn({ err: error }, 'Init DB failed')
      throw error
    }
  }

  try {
    await app.listen({ host: '0.0.0.0', port: defaultPort ?? 8080 })
  } catch (error) {
    logger.error({ err: error }, 'Failed to start HTTP server')
    process.exit(1)
  }
  logger.debug({ isDev, isTest, isCI, isDevSetup, isProd })
}

export async function getPreparedApp() {
  try {
    await getConnection()
  } catch (error) {
    logger.error({ err: error }, 'Database connection failed')
    throw error
  }

  initPm()

  logger.info('Reading init database file')

  try {
    const dataPath = (isProd || isInt)
      ? './init/db/imports/data.js'
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
    const err = error as any
    if (err?.code === 'ERR_MODULE_NOT_FOUND' || err?.message?.includes('Failed to load') || err?.message?.includes('Cannot find module')) {
      logger.info('No initDb file, skipping')
    } else {
      logger.warn({ err: error }, 'Init DB failed')
      throw error
    }
  }

  logger.debug({ isDev, isTest, isCI, isDevSetup, isProd })
  return app
}
