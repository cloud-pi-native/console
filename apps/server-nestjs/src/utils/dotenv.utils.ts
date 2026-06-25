import fs from 'node:fs'

export function getDotenvPaths(): string[] {
  const paths: string[] = []

  // Load .env unless DOCKER=true
  if (process.env.DOCKER !== 'true') {
    paths.push('.env')
  }

  // Load .env.integ if INTEGRATION=true
  if (process.env.INTEGRATION === 'true') {
    paths.push('.env.integ')
  }

  // Load .env.docker if DOCKER=true
  if (process.env.DOCKER === 'true') {
    paths.push('.env.docker')
  }

  return paths
}

export function getExistingDotenvPaths(): string[] {
  return getDotenvPaths().filter(path => fs.existsSync(path))
}
