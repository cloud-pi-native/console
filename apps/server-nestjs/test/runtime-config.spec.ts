import { readFileSync } from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'
import { z } from 'zod'

const root = path.resolve(__dirname, '../../..')
const serviceSchema = z.object({
  env_file: z.array(z.string()).optional(),
  depends_on: z.union([
    z.array(z.string()),
    z.record(z.object({ condition: z.string() })),
  ]).optional(),
}).passthrough()
const composeSchema = z.object({ services: z.record(serviceSchema) })

function read(relative: string) {
  return readFileSync(path.join(root, relative), 'utf8')
}

describe('direct NestJS runtime', () => {
  it.each(['local', 'dev', 'integ', 'ci'])('does not start or depend on legacy services in %s', (mode) => {
    const compose = composeSchema.parse(parse(read(`docker/docker-compose.${mode}.yml`)))

    expect(Object.keys(compose.services)).not.toContain('server')
    expect(Object.keys(compose.services)).not.toContain('nginx-strangler')
    for (const service of Object.values(compose.services)) {
      expect(JSON.stringify(service.depends_on ?? {})).not.toMatch(/"(server|nginx-strangler)"/)
      expect(service.env_file ?? []).not.toEqual(expect.arrayContaining([expect.stringContaining('apps/server/')]))
    }
    if (mode !== 'local') {
      expect(compose.services.client.depends_on).toMatchObject({ 'server-nestjs': { condition: 'service_healthy' } })
    }
  })

  it('builds and publishes only the active applications', () => {
    const docker = z.array(z.object({ name: z.string() })).parse(JSON.parse(read('ci/matrix-docker.json')))
    expect(docker.map(image => image.name).sort()).toEqual(['client', 'opencds-mockoon', 'server-nestjs'])
    const npm = z.object({ apps: z.array(z.object({ name: z.string() })) }).parse(JSON.parse(read('ci/matrix-npm.json')))
    expect(npm.apps.map(app => app.name).sort()).toEqual(['@cpn-console/client', '@cpn-console/server-nestjs'])
  })

  it('does not use legacy configuration or commands in root scripts', () => {
    const pkg = z.object({ scripts: z.record(z.string()) }).parse(JSON.parse(read('package.json')))
    for (const script of Object.values(pkg.scripts)) {
      expect(script).not.toMatch(/apps\/server\/|@cpn-console\/server(?:\s|$)|nginx-strangler/)
    }
    expect(pkg.scripts.dev).toContain('@cpn-console/server-nestjs run start:dev')
    expect(pkg.scripts.integ).toContain('@cpn-console/server-nestjs run integ')
  })

  it('activates integration environment loading for both native applications', () => {
    const schema = z.object({ scripts: z.record(z.string()) })
    for (const app of ['client', 'server-nestjs']) {
      const pkg = schema.parse(JSON.parse(read(`apps/${app}/package.json`)))
      expect(pkg.scripts.integ).toContain('INTEGRATION=true')
    }
  })

  it('excludes frozen legacy sources from recursive workspace commands', () => {
    const workspace = z.object({ packages: z.array(z.string()) }).parse(parse(read('pnpm-workspace.yaml')))
    expect(workspace.packages).toContain('!apps/server/**')
  })
})
