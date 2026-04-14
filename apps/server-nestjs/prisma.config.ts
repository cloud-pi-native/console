import path from 'node:path'
import { defineConfig } from 'prisma/config'

if (process.env.INTEGRATION === 'true')
  process.loadEnvFile('.env.integ')

if (process.env.DOCKER !== 'true')
  process.loadEnvFile('.env')

export default defineConfig({
  schema: path.join('src', 'prisma', 'schema'),
  migrations: {
    path: path.join('src', 'prisma', 'migrations'),
  },
})
