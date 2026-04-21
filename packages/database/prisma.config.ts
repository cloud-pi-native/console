import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'prisma/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const repoRoot = path.resolve(__dirname, '..', '..')
const serverEnvDir = path.resolve(repoRoot, 'apps', 'server')

const envInteg = path.resolve(serverEnvDir, '.env.integ')
const envDocker = path.resolve(serverEnvDir, '.env.docker')
const envBase = path.resolve(serverEnvDir, '.env')

if (process.env.INTEGRATION === 'true' && fs.existsSync(envInteg))
  process.loadEnvFile(envInteg)

if (process.env.DOCKER === 'true' && fs.existsSync(envDocker))
  process.loadEnvFile(envDocker)

if (fs.existsSync(envBase))
  process.loadEnvFile(envBase)

export default defineConfig({
  schema: path.join('prisma', 'schema'),
  migrations: {
    path: path.join('prisma', 'migrations'),
  },
})
