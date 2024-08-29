import { rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isCI, isDev, isDevSetup, isInt, isProd, isTest, port } from './utils/env.js'
import app from './app.js'
import { getConnection } from './connect.js'
import { initDb } from './init/db/index.js'
import { initPm } from './plugins.js'

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
  app.log.info('Starting init DB...')
  const { data } = await import(path)
  await initDb(data)
  app.log.info('initDb invoked successfully')
}

export async function startServer(defaultPort: number = (port ? +port : 8080)) {
  try {
    await getConnection()
  } catch (error) {
    if (!(error instanceof Error)) return
    app.log.error(error.message)
    throw error
  }

  initPm()

  app.log.info('Reading init database file')

  try {
    const dataPath = (isProd || isInt)
      ? './init/db/imports/data.js'
      : '@cpn-console/test-utils/src/imports/data.ts'
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
    await app.listen({ host: '0.0.0.0', port: defaultPort ?? 8080 })
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
  app.log.debug({ isDev, isTest, isCI, isDevSetup, isProd })
}

export async function getPreparedApp() {
  try {
    await getConnection()
  } catch (error) {
    app.log.error(error.message)
    throw error
  }

  initPm()

  app.log.info('Reading init database file')

  try {
    const dataPath = (isProd || isInt)
      ? './init/db/imports/data.js'
      : '@cpn-console/test-utils/src/imports/data.ts'
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

  app.log.debug({ isDev, isTest, isCI, isDevSetup, isProd })
  return app
}
