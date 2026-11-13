import { readFileSync } from 'node:fs'

function parseVersion(value: unknown, source: string): string {
  if (typeof value !== 'string' || !/^\d+\.\d+\.\d+$/u.test(value) || value.trim() !== value) {
    throw new Error(`${source} doit fournir une version exacte de Playwright (majeure.mineure.patch), reçue : ${JSON.stringify(value)}.`)
  }
  return value
}

function readApplicationVersion(): string {
  const packagePath = new URL('../../playwright/node_modules/@playwright/test/package.json', import.meta.url)
  let packageData: unknown
  try {
    packageData = JSON.parse(readFileSync(packagePath, 'utf8'))
  } catch {
    throw new Error('Impossible de lire @playwright/test installé pour playwright/. Installer les dépendances depuis le lockfile de la branche.')
  }
  if (typeof packageData !== 'object' || packageData === null || !('version' in packageData)) {
    throw new Error('Le paquet @playwright/test installé pour playwright/ ne contient pas de version.')
  }
  return parseVersion(packageData.version, '@playwright/test')
}

try {
  const runnerVersion = parseVersion(process.env.RUNNER_PLAYWRIGHT_VERSION, 'RUNNER_PLAYWRIGHT_VERSION')
  const applicationVersion = readApplicationVersion()
  if (applicationVersion !== runnerVersion) {
    throw new Error(`Versions Playwright différentes : application=${applicationVersion} ; runner=${runnerVersion}. Un alignement explicite est requis ; les navigateurs du runner ne seront pas réinstallés.`)
  }
  console.log(`Versions Playwright alignées : application=${applicationVersion} ; runner=${runnerVersion}.`)
} catch (error) {
  if (!(error instanceof Error)) {
    throw error
  }
  console.error(`::error::${error.message}`)
  process.exitCode = 1
}
