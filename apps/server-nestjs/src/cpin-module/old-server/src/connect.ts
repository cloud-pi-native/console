// import { setTimeout } from 'node:timers/promises'
// import prisma from './prisma'
// import { logger } from './app'
// import {
  // dbUrl,
  // isCI,
  // isDev,
  // isTest,
// } from './utils/env'

// const DELAY_BEFORE_RETRY = isTest || isCI ? 1000 : 10000
// let closingConnections = false

// export async function getConnection(triesLeft = 5): Promise<void> {
  // if (closingConnections || triesLeft <= 0) {
    // throw new Error('Unable to connect to Postgres server')
  // }
  // triesLeft--

  // try {
    // if (isDev || isTest || isCI) {
      // logger.info(`Trying to connect to Postgres with: ${dbUrl}`)
    // }
    // await prisma.$connect()

    // logger.info('Connected to Postgres!')
  // } catch (error) {
    // if (triesLeft > 0) {
      // logger.error(error)
      // logger.info(`Could not connect to Postgres: ${error.message}`)
      // logger.info(`Retrying (${triesLeft} tries left)`)
      // await setTimeout(DELAY_BEFORE_RETRY)
      // return getConnection(triesLeft)
    // }

    // logger.info(`Could not connect to Postgres: ${error.message}`)
    // logger.info('Out of retries')
    // error.message = `Out of retries, last error: ${error.message}`
    // throw error
  // }
// }

// export async function closeConnections() {
  // closingConnections = true
  // try {
    // await prisma.$disconnect()
  // } catch (error) {
    // logger.error(error)
  // } finally {
    // closingConnections = false
  // }
// }
