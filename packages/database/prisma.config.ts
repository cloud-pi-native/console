import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as dotenv from 'dotenv'
import { defineConfig } from 'prisma/config'

const configDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(configDir, '..', '..')

if (process.env.DOCKER !== 'true') {
  dotenv.config({ path: path.join(repoRoot, 'apps', 'server', '.env') })
}

if (process.env.INTEGRATION === 'true') {
  const envInteg = dotenv.config({
    path: path.join(repoRoot, 'apps', 'server', '.env.integ'),
  })
  process.env = {
    ...process.env,
    ...(envInteg?.parsed ?? {}),
  }
}

export default defineConfig({
  schema: path.join('prisma', 'schema'),
  migrations: {
    path: path.join('prisma', 'migrations'),
  },
})
