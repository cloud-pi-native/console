import { closeConnections } from './connect.js'
import { getPreparedApp } from './prepare-app.js'

import { isCI, isDev, isDevSetup, isProd, isTest, port } from './utils/env.js'

const app = await getPreparedApp()

try {
  await app.listen({ host: '0.0.0.0', port: +(port ?? 8080) })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}

app.log.debug({ isDev, isTest, isCI, isDevSetup, isProd })

export async function exitGracefully(error?: Error) {
  if (error instanceof Error) {
    app.log.error(error)
  }
  await app.close()
  app.log.info('Closing connections...')
  await closeConnections()
  app.log.info('Exiting...')
  process.exit(error instanceof Error ? 1 : 0)
}

function logExitCode(code: number) {
  console.log(`received signal: ${code}`)
}

function logUnhandledRejection(reason: unknown, promise: Promise<unknown>) {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason)
}

export function handleExit() {
  process.on('exit', logExitCode)
  process.on('SIGINT', exitGracefully)
  process.on('SIGTERM', exitGracefully)
  process.on('uncaughtException', exitGracefully)
  process.on('unhandledRejection', logUnhandledRejection)
}

handleExit()
