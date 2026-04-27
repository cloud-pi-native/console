import fs from 'node:fs'
import path from 'node:path'
import { parseEnv } from 'node:util'
import { defineConfig } from 'prisma/config'

if (process.env.DOCKER !== 'true' && fs.existsSync('.env'))
  Object.assign(process.env, parseEnv(fs.readFileSync(path.resolve('.env'), 'utf-8')))

if (process.env.INTEGRATION === 'true' && fs.existsSync('.env.integ'))
  Object.assign(process.env, parseEnv(fs.readFileSync(path.resolve('.env.integ'), 'utf-8')))

export default defineConfig({
  schema: path.join('src', 'prisma', 'schema'),
  migrations: {
    path: path.join('src', 'prisma', 'migrations'),
  },
})
