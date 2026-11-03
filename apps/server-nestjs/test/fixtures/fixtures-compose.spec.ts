import { readFileSync } from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'
import { z } from 'zod'

const serviceSchema = z.object({
  build: z.object({ target: z.string() }).passthrough(),
  depends_on: z.record(z.object({ condition: z.string() })),
  environment: z.record(z.union([z.string(), z.boolean()])),
  volumes: z.array(z.string()).optional(),
}).passthrough()

describe('cI fixtures ownership', () => {
  it('seeds once before either backend starts and removes the legacy import mount', () => {
    const root = path.resolve(__dirname, '../../../..')
    const compose = z.object({ services: z.object({
      fixtures: serviceSchema,
      server: serviceSchema,
      'server-nestjs': serviceSchema,
    }).passthrough() }).parse(parse(readFileSync(path.join(root, 'docker/docker-compose.ci.yml'), 'utf8')))

    expect(compose.services.fixtures.build.target).toBe('fixtures')
    expect(compose.services.fixtures.environment.NODE_ENV).toBe('test')
    expect(compose.services.fixtures.depends_on.postgres.condition).toBe('service_healthy')
    expect(compose.services.server.depends_on.fixtures.condition).toBe('service_completed_successfully')
    expect(compose.services['server-nestjs'].depends_on.fixtures.condition).toBe('service_completed_successfully')
    expect(compose.services.server.volumes ?? []).not.toEqual(expect.arrayContaining([expect.stringContaining('/imports/data')]))
  })
})
