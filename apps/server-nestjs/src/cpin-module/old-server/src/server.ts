// import { getPreparedApp } from './prepare-app'
// import { closeConnections } from './connect'
// import { isCI, isDev, isDevSetup, isProd, isTest, port } from './utils/env'
// import { logger } from './app'

// const app = await getPreparedApp()

// try {
  // await app.listen({ host: '0.0.0.0', port: +(port ?? 8080) })
// } catch (error) {
  // logger.error(error)
  // process.exit(1)
// }

// logger.debug({ isDev, isTest, isCI, isDevSetup, isProd })

// export async function exitGracefully(error?: Error) {
  // if (error instanceof Error) {
    // logger.fatal(error)
  // }
  // await app.close()
  // logger.info('Closing connections...')
  // await closeConnections()
  // logger.info('Exiting...')
  // process.exit(error instanceof Error ? 1 : 0)
// }

// function logExitCode(code: number) {
  // logger.warn(`received signal: ${code}`)
// }

// function logUnhandledRejection(reason: unknown, promise: Promise<unknown>) {
  // logger.error({ message: 'Unhandled Rejection', promise, reason })
// }

// export function handleExit() {
  // process.on('exit', logExitCode)
  // process.on('SIGINT', exitGracefully)
  // process.on('SIGTERM', exitGracefully)
  // process.on('uncaughtException', exitGracefully)
  // process.on('unhandledRejection', logUnhandledRejection)
// }

// handleExit()
