import process from 'node:process'
import { getPreparedApp } from './prepare-app.js'
import { closeConnections } from './connect.js'

import { port, isDev, isTest, isCI, isDevSetup, isProd } from './utils/env.js'

const app = await getPreparedApp()

handleExit()

try {
  await app.listen({ host: '0.0.0.0', port: +(port ?? 8080) })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}

app.log.debug({ isDev, isTest, isCI, isDevSetup, isProd })

export function handleExit () {
  process.on('exit', exitGracefully)
  process.on('SIGINT', exitGracefully)
  process.on('SIGTERM', exitGracefully)
  process.on('uncaughtException', exitGracefully)
  process.on('unhandledRejection', (err: Error) => {
    app.log.warn(err)
    process.exit(1)
  })
}

export async function exitGracefully (error?: Error) {
  if (error instanceof Error) {
    app.log.error(error)
  }
  await app.close()
  app.log.info('Closing connections...')
  await closeConnections()
  app.log.info('Exiting...')
  process.exit(error instanceof Error ? 1 : 0)
}
