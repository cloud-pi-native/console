import { isProd, isDevSetup, isInt } from './utils/env.js'
import { rm } from 'node:fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { getConnection, closeConnections } from './connect.js'
import { initDb } from './init/db/index.js'

await startServer()
handleExit()

async function initializeDB (path: string) {
  console.log('Starting init DB...')
  const { data } = await import(path)
  await initDb(data)
  console.log('initDb invoked successfully')
}

export async function startServer () {
  await getConnection()

  console.log('Reading init database file')

  try {
    const dataPath = (isProd || isInt)
      ? './init/db/imports/data.js'
      : '@dso-console/test-utils/src/imports/data.ts'
    await initializeDB(dataPath)
    if (isProd && !isDevSetup) {
      console.log('Cleaning up imported data file...')
      const __filename = fileURLToPath(import.meta.url)
      const __dirname = dirname(__filename)
      await rm(resolve(__dirname, dataPath))
      console.log(`Successfully deleted '${dataPath}'`)
    }
  } catch (error) {
    console.log('No initDb file, skipping')
  }
}

export function handleExit () {
  process.on('exit', exitGracefully)
  process.on('SIGINT', exitGracefully)
  process.on('SIGTERM', exitGracefully)
  process.on('uncaughtException', exitGracefully)
}

export async function exitGracefully (error: Error) {
  console.log('Closing connections...')
  await closeConnections()
  console.log('Exiting...')
  process.exit(error instanceof Error ? 1 : 0)
}
