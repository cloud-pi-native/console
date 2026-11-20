import { z } from 'zod'

const fixturesConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test']),
  INTEGRATION: z.string().optional().refine(value => value !== 'true', 'INTEGRATION environments cannot load fixtures'),
  DB_URL: z.string().url().refine((value) => {
    if (!URL.canParse(value)) return false
    const url = new URL(value)
    return ['postgres:', 'postgresql:'].includes(url.protocol) && url.hostname.length > 0 && url.pathname.length > 1
  }, 'DB_URL must identify a PostgreSQL database'),
})

export function parseFixtureConfig(env: NodeJS.ProcessEnv, args: string[]) {
  if (args.length !== 1 || args[0] !== '--reset') {
    throw new Error('Fixture reset requires the single argument --reset (all existing data will be deleted)')
  }
  const config = fixturesConfigSchema.parse(env)
  return { dbUrl: config.DB_URL }
}
