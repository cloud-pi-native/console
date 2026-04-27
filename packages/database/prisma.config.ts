import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseEnv } from 'node:util'
import { defineConfig } from 'prisma/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const repoRoot = path.resolve(__dirname, '..', '..')
const serverEnvDir = path.resolve(repoRoot, 'apps', 'server')

const envInteg = path.resolve(serverEnvDir, '.env.integ')
const envBase = path.resolve(serverEnvDir, '.env')

if (process.env.DOCKER !== 'true' && fs.existsSync(envBase)) {
  Object.assign(process.env, Object.fromEntries(
    Object.entries(parseEnv(fs.readFileSync(envBase, 'utf-8'))).filter(Boolean),
  ))
}

if (process.env.INTEGRATION === 'true' && fs.existsSync(envInteg)) {
  Object.assign(process.env, Object.fromEntries(
    Object.entries(parseEnv(fs.readFileSync(envInteg, 'utf-8'))).filter(Boolean),
  ))
}

export default defineConfig({
  schema: path.join('prisma', 'schema'),
  migrations: {
    path: path.join('prisma', 'migrations'),
  },
})
