import { setTimeout } from 'node:timers/promises'
import { logger } from '@cpn-console/logger'
import prisma from './prisma.js'
import {
  dbUrl,
  isCI,
  isDev,
  isTest,
} from './utils/env.js'

const DELAY_BEFORE_RETRY = isTest ? 0 : isCI ? 1000 : 10000
let closingConnections = false
const leadingSlashRegExp = /^\//

function parseDbUrl(url: string | undefined) {
  if (!url) return undefined
  try {
    const parsed = new URL(url)
    return {
      host: parsed.host,
      database: parsed.pathname?.replace(leadingSlashRegExp, '') || undefined,
    }
  } catch {
    return undefined
  }
}

export async function getConnection(triesLeft = 5): Promise<void> {
  if (closingConnections || triesLeft <= 0) {
    throw new Error('Unable to connect to Postgres server')
  }
  triesLeft--

  try {
    if (isDev || isTest || isCI)
      logger.debug({ db: parseDbUrl(dbUrl) }, 'Connecting to Postgres')
    await prisma.$connect()

    logger.info('Connected to Postgres!')
  } catch (err) {
    if (triesLeft > 0) {
      logger.error({ err }, 'Could not connect to Postgres')
      logger.info({ triesLeft }, 'Retrying Postgres connection')
      await setTimeout(DELAY_BEFORE_RETRY)
      return getConnection(triesLeft)
    }

    logger.error({ err }, 'Out of retries connecting to Postgres')
    err.message = `Out of retries connecting to Postgres, last error: ${err.message}`
    throw err
  }
}

export async function closeConnections() {
  closingConnections = true
  try {
    await prisma.$disconnect()
  } catch (error) {
    logger.error({ err: error }, 'Could not disconnect from Postgres')
  } finally {
    closingConnections = false
  }
}
