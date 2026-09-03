import type { ConfigType } from '@nestjs/config'
import type { HarborRepository, HarborRetentionPolicy } from './registry-client.service'
import { faker } from '@faker-js/faker'
import { HttpStatus } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { harborConfigFactory } from '../../config/harbor.config'
import { VaultClientService } from '../vault/vault-client.service'
import { RegistryClientService } from './registry-client.service'
import { RegistryHttpClientService } from './registry-http-client.service'
import { HARBOR_INTERNAL_URL, makeRegistryDb, makeRegistryHandlers, makeRobotPermissions } from './registry-testing.utils'

const harborUrl = HARBOR_INTERNAL_URL
const harborAdminPassword = faker.internet.password()
const basicAuth = `Basic ${Buffer.from(`admin:${harborAdminPassword}`, 'utf8').toString('base64')}`

const server = setupServer()

describe('registryService', () => {
  let service: RegistryClientService
  let db: ReturnType<typeof makeRegistryDb>

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  beforeEach(async () => {
    db = makeRegistryDb()
    server.use(...makeRegistryHandlers(db))

    const harborConfig = mockDeep<ConfigType<typeof harborConfigFactory>>({
      url: harborUrl,
      internalUrl: harborUrl,
      admin: 'admin',
      adminPassword: harborAdminPassword,
      ruleTemplate: 'latestPushedK',
      ruleCount: 10,
      retentionCron: '0 22 2 * * *',
    })
    const module = await Test.createTestingModule({
      providers: [
        RegistryClientService,
        RegistryHttpClientService,
        {
          provide: VaultClientService,
          useValue: {},
        },
        {
          provide: harborConfigFactory.KEY,
          useValue: harborConfig,
        },
      ],
    }).compile()
    service = module.get(RegistryClientService)
  })
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should reconcile a project creation conflict (400 CONFLICT) by reloading the existing project', async () => {
    await db.projects.create({ name: 'myproj', project_id: 123, metadata: {} })

    const result = await service.ensureProject('myproj', -1)

    expect(result).toMatchObject({ project_id: 123, metadata: {} })
  })

  it('should reconcile a real HTTP 409 on project create by reloading the existing project', async () => {
    server.use(
      http.post(`${harborUrl}/api/v2.0/projects`, () =>
        new HttpResponse(null, { status: HttpStatus.CONFLICT })),
    )
    await db.projects.create({ name: 'myproj', project_id: 123, metadata: {} })

    const result = await service.ensureProject('myproj', -1)

    expect(result).toMatchObject({ project_id: 123, metadata: {} })
  })

  it('should send basic auth and JSON body on ensureProject', async () => {
    server.use(
      http.post(`${harborUrl}/api/v2.0/projects`, async ({ request }) => {
        expect(request.method).toBe('POST')
        expect(request.url).toBe(`${harborUrl}/api/v2.0/projects`)
        expect(request.headers.get('accept')).toBe('application/json')
        expect(request.headers.get('authorization')).toBe(basicAuth)
        expect(request.headers.get('content-type')).toContain('application/json')
        expect(await request.json()).toEqual({
          project_name: 'myproj',
          metadata: { auto_scan: 'true' },
          storage_limit: -1,
        })
        return HttpResponse.json({}, { status: HttpStatus.CREATED })
      }),
    )
    await db.projects.create({ name: 'myproj', project_id: 123, metadata: {} })

    const result = await service.ensureProject('myproj', -1)

    expect(result).toMatchObject({ project_id: 123, metadata: {} })
  })

  it('should not rotate an existing robot on creation conflict (400 CONFLICT)', async () => {
    await db.robots.create({
      id: 33,
      name: 'ro-robot',
      description: 'robot for ci builds',
      level: 'project',
      permissions: makeRobotPermissions(),
    })
    server.use(
      http.get(`${harborUrl}/api/v2.0/robots`, () => {
        throw new Error('robot listing must not be called on conflict')
      }),
      http.delete(`${harborUrl}/api/v2.0/robots/33`, () => {
        throw new Error('robot deletion must not be called on conflict')
      }),
    )

    const result = await service.ensureRobot({
      name: 'ro-robot',
      duration: -1,
      description: 'robot for ci builds',
      disable: false,
      level: 'project',
      permissions: makeRobotPermissions(),
    })

    expect(result).toBeUndefined()
  })

  it('should send X-Is-Resource-Name on getProjectByName', async () => {
    await db.projects.create({ name: 'myproj', project_id: 123, metadata: {} })

    const res = await service.getProjectByName('myproj')

    expect(res).toMatchObject({ status: HttpStatus.OK, data: { project_id: 123 } })
  })

  it('should list repositories with page_size', async () => {
    await db.repositories.create({ name: 'myproj/repo-a' })

    const res: HarborRepository[] = []
    for await (const item of service.getRepositories('myproj')) {
      res.push(item)
    }

    expect(res).toMatchObject([{ name: 'myproj/repo-a' }])
  })

  it('should delete a repository by name', async () => {
    const res = await service.deleteRepository('myproj', 'repo-a')

    expect(res).toMatchObject({ status: HttpStatus.NO_CONTENT })
  })

  it('should reconcile the existing retention policy on re-sync without issuing a second create', async () => {
    const policy: HarborRetentionPolicy = {
      algorithm: 'or',
      scope: { level: 'project', ref: 123 },
      rules: [],
      trigger: { kind: 'Schedule', settings: { cron: '0 22 2 * * *' }, references: [] },
    }
    await db.projects.create({ name: 'myproj', project_id: 123, metadata: { retention_id: '325' } })
    server.use(
      http.post(`${harborUrl}/api/v2.0/retentions`, () => {
        throw new Error('a second retention create must not be issued on re-sync')
      }),
    )

    const id = await service.ensureRetention('myproj', policy)

    expect(id).toBeUndefined()
  })

  it('should create a retention policy when none exists yet', async () => {
    const policy: HarborRetentionPolicy = {
      algorithm: 'or',
      scope: { level: 'project', ref: 123 },
      rules: [],
      trigger: { kind: 'Schedule', settings: { cron: '0 22 2 * * *' }, references: [] },
    }
    await db.projects.create({ name: 'myproj', project_id: 123, metadata: {} })

    await service.ensureRetention('myproj', policy)
  })
})
