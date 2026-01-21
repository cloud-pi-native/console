import path from 'node:path'
import { defineConfig } from 'prisma/config'
import * as dotenv from 'dotenv'

if (process.env.DOCKER !== 'true') {
  dotenv.config({ path: '.env' })
}

if (process.env.INTEGRATION === 'true') {
  const envInteg = dotenv.config({ path: '.env.integ' })
  process.env = {
    ...process.env,
    ...(envInteg?.parsed ?? {}),
  }
}

export default defineConfig({
  schema: path.join('src', 'prisma', 'schema'),
  migrations: {
    path: path.join('src', 'prisma', 'migrations'),
  },
})
