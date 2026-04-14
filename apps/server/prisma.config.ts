import { defineConfig, env } from 'prisma/config'

if (process.env.DOCKER !== 'true') {
  process.loadEnvFile('.env')
}

if (process.env.INTEGRATION === 'true') {
  process.loadEnvFile('.env.integ')
}

export default defineConfig({
  schema: 'src/prisma/schema',
  migrations: {
    path: 'src/prisma/migrations',
  },
  datasource: {
    url: env('DB_URL'),
  },
})
