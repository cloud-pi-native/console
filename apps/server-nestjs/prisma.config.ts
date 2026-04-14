import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'prisma/config'

if (process.env.INTEGRATION === 'true' && fs.existsSync('.env.integ'))
  process.loadEnvFile('.env.integ')

if (process.env.DOCKER !== 'true' && fs.existsSync('.env'))
  process.loadEnvFile('.env')

export default defineConfig({
  schema: path.join('src', 'prisma', 'schema'),
  migrations: {
    path: path.join('src', 'prisma', 'migrations'),
  },
})
