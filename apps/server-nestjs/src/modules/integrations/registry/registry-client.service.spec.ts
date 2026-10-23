import type { ConfigType } from '@nestjs/config'
import type { HarborRepository, HarborRetentionPolicy, HarborRobot } from './registry-client.service'
import { faker } from '@faker-js/faker'
import { HttpStatus } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { harborConfigFactory } from '../../../config/harbor.config'
import { VaultClientService } from '../vault/vault-client.service'
import { RegistryClientService } from './registry-client.service'
import { RegistryHttpClientService } from './registry-http-client.service'

const harborUrl = 'https://harbor.example'
const harborAdminPassword = faker.internet.password()
const basicAuth = `Basic ${Buffer.from(`admin:${harborAdminPassword}`, 'utf8').toString('base64')}`

const server = setupServer()

describe('registryService', () => {
  let service: RegistryClientService

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

  beforeEach(async () => {
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
    server.use(
      http.post(`${harborUrl}/api/v2.0/projects`, () =>
        HttpResponse.json({
          errors: [{ code: 'CONFLICT', message: 'project myproj already exists' }],
        }, { status: HttpStatus.BAD_REQUEST })),
      http.get(`${harborUrl}/api/v2.0/projects/:projectName`, async ({ request, params }) => {
        expect(request.headers.get('x-is-resource-name')).toBe('true')
        expect(params.projectName).toBe('myproj')
        return HttpResponse.json({ project_id: 123, metadata: {} })
      }),
    )

    const result = await service.ensureProject('myproj', -1)

    expect(result).toEqual({ project_id: 123, metadata: {} })
  })

  it('should reconcile a real HTTP 409 on project create by reloading the existing project', async () => {
    server.use(
      http.post(`${harborUrl}/api/v2.0/projects`, () =>
        new HttpResponse(null, { status: HttpStatus.CONFLICT })),
      http.get(`${harborUrl}/api/v2.0/projects/:projectName`, async ({ request, params }) => {
        expect(request.headers.get('x-is-resource-name')).toBe('true')
        expect(params.projectName).toBe('myproj')
        return HttpResponse.json({ project_id: 123, metadata: {} })
      }),
    )

    const result = await service.ensureProject('myproj', -1)

    expect(result).toEqual({ project_id: 123, metadata: {} })
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
      http.get(`${harborUrl}/api/v2.0/projects/:projectName`, async ({ request, params }) => {
        expect(request.headers.get('authorization')).toBe(basicAuth)
        expect(params.projectName).toBe('myproj')
        return HttpResponse.json({ project_id: 123, metadata: {} })
      }),
    )

    const result = await service.ensureProject('myproj', -1)
    expect(result).toEqual({ project_id: 123, metadata: {} })
  })

  it('should not rotate an existing robot on creation conflict (400 CONFLICT)', async () => {
    server.use(
      http.post(`${harborUrl}/api/v2.0/robots`, () => HttpResponse.json({
        errors: [{ code: 'CONFLICT', message: 'robot robot$myproj+ro-robot already exists' }],
      }, { status: HttpStatus.BAD_REQUEST })),
      http.get(`${harborUrl}/api/v2.0/projects/myproj`, ({ request }) => {
        expect(request.headers.get('x-is-resource-name')).toBe('true')
        return HttpResponse.json({ project_id: 123, metadata: {} })
      }),
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
      permissions: [{ namespace: 'myproj', kind: 'project', access: [{ resource: 'repository', action: 'pull' }] }],
    })

    expect(result).toBeUndefined()
  })

  it('should send X-Is-Resource-Name on getProjectByName', async () => {
    server.use(
      http.get(`${harborUrl}/api/v2.0/projects/:projectName`, async ({ request, params }) => {
        expect(request.method).toBe('GET')
        expect(request.headers.get('authorization')).toBe(basicAuth)
        expect(request.headers.get('x-is-resource-name')).toBe('true')
        expect(params.projectName).toBe('myproj')
        return HttpResponse.json({ project_id: 123, metadata: {} })
      }),
    )

    const res = await service.getProjectByName('myproj')

    expect(res).toMatchObject({ status: HttpStatus.OK, data: { project_id: 123 } })
  })

  it('should list repositories with page_size', async () => {
    server.use(
      http.get(`${harborUrl}/api/v2.0/projects/:projectName/repositories`, async ({ request }) => {
        expect(request.url).toContain('page_size=100')
        return HttpResponse.json([{ name: 'myproj/repo-a' }])
      }),
    )

    const res: HarborRepository[] = []
    for await (const item of service.getRepositories('myproj')) {
      res.push(item)
    }

    expect(res).toMatchObject([{ name: 'myproj/repo-a' }])
  })

  it('should delete a repository by name', async () => {
    server.use(
      http.delete(`${harborUrl}/api/v2.0/projects/:projectName/repositories/:repositoryName`, async ({ request, params }) => {
        expect(request.method).toBe('DELETE')
        expect(params.projectName).toBe('myproj')
        expect(params.repositoryName).toBe('repo-a')
        return new HttpResponse(null, { status: HttpStatus.NO_CONTENT })
      }),
    )

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
    server.use(
      http.get(`${harborUrl}/api/v2.0/projects/myproj`, ({ request }) => {
        expect(request.headers.get('x-is-resource-name')).toBe('true')
        return HttpResponse.json({ project_id: 123, metadata: { retention_id: '325' } })
      }),
      http.put(`${harborUrl}/api/v2.0/retentions/325`, async ({ request }) => {
        expect(request.method).toBe('PUT')
        expect(await request.json()).toEqual(policy)
        return new HttpResponse(null, { status: HttpStatus.OK })
      }),
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
    let reads = 0
    server.use(
      http.get(`${harborUrl}/api/v2.0/projects/myproj`, ({ request }) => {
        expect(request.headers.get('x-is-resource-name')).toBe('true')
        reads += 1
        return HttpResponse.json({ project_id: 123, metadata: {} })
      }),
      http.post(`${harborUrl}/api/v2.0/retentions`, async ({ request }) => {
        expect(await request.json()).toEqual(policy)
        return HttpResponse.json({ id: 500 }, { status: HttpStatus.CREATED })
      }),
      // After a successful create there is no policy to reconcile in place.
      http.put(`${harborUrl}/api/v2.0/retentions/:id`, () => {
        throw new Error('a fresh create must not also issue a reconcile PUT')
      }),
    )

    await service.ensureRetention('myproj', policy)

    expect(reads).toBe(1)
  })

  describe('quotas', () => {
    it('lists quotas for a project id', async () => {
      server.use(
        http.get(`${harborUrl}/api/v2.0/quotas`, ({ request }) => {
          expect(new URL(request.url).searchParams.get('reference_id')).toBe('123')
          return HttpResponse.json([{ id: 7, hard: { storage: -1 } }])
        }),
      )

      await expect(service.listQuotas(123)).resolves.toMatchObject({
        status: HttpStatus.OK,
        data: [{ id: 7, hard: { storage: -1 } }],
      })
    })

    it('updates a quota hard storage limit', async () => {
      server.use(
        http.put(`${harborUrl}/api/v2.0/quotas/123`, async ({ request }) => {
          expect(await request.json()).toEqual({ hard: { storage: 42 } })
          return new HttpResponse(null, { status: HttpStatus.OK })
        }),
      )

      await expect(service.updateQuota(123, 42)).resolves.toMatchObject({ status: HttpStatus.OK })
    })
  })

  describe('group members', () => {
    it('lists group members with X-Is-Resource-Name', async () => {
      server.use(
        http.get(`${harborUrl}/api/v2.0/projects/:projectName/members`, ({ request }) => {
          expect(request.headers.get('x-is-resource-name')).toBe('true')
          return HttpResponse.json([{ id: 9, entity_name: 'oidc-group' }])
        }),
      )

      await expect(service.getGroupMembers('myproj')).resolves.toMatchObject({
        status: HttpStatus.OK,
        data: [{ id: 9, entity_name: 'oidc-group' }],
      })
    })

    it('ensures a group member and reloads on collision', async () => {
      const body = { member_group: { group_name: 'oidc-group', group_type: 1 }, role_id: 2 }
      server.use(
        http.post(`${harborUrl}/api/v2.0/projects/:projectName/members`, ({ request }) => {
          expect(request.headers.get('x-is-resource-name')).toBe('true')
          return HttpResponse.json({ errors: [{ code: 'CONFLICT', message: 'already exists' }] }, { status: HttpStatus.BAD_REQUEST })
        }),
        http.get(`${harborUrl}/api/v2.0/projects/:projectName/members`, () =>
          HttpResponse.json([{ id: 9, entity_name: 'oidc-group' }])),
      )

      await expect(service.ensureGroupMember('myproj', body)).resolves.toBeUndefined()
    })

    it('removes a group member by id', async () => {
      server.use(
        http.delete(`${harborUrl}/api/v2.0/projects/:projectName/members/:memberId`, ({ request, params }) => {
          expect(request.headers.get('x-is-resource-name')).toBe('true')
          expect(params.memberId).toBe('9')
          return new HttpResponse(null, { status: HttpStatus.OK })
        }),
      )

      await expect(service.removeGroupMember('myproj', 9)).resolves.toMatchObject({ status: HttpStatus.OK })
    })
  })

  describe('project robots', () => {
    it('lists project robots through the paginated endpoint', async () => {
      server.use(
        http.get(`${harborUrl}/api/v2.0/robots`, ({ request }) => {
          const query = new URL(request.url).searchParams
          expect(query.get('q')).toBe('Level=project,ProjectID=123')
          expect(query.get('page')).toBe('1')
          return HttpResponse.json([{ id: 3, name: 'robot$myproj+ro' }])
        }),
      )

      const robots: HarborRobot[] = []
      for await (const robot of service.getProjectRobots(123)) {
        robots.push(robot)
      }

      expect(robots).toMatchObject([{ id: 3, name: 'robot$myproj+ro' }])
    })

    it('deletes a robot by id', async () => {
      server.use(
        http.delete(`${harborUrl}/api/v2.0/robots/:robotId`, ({ params }) => {
          expect(params.robotId).toBe('3')
          return new HttpResponse(null, { status: HttpStatus.OK })
        }),
      )

      await expect(service.deleteRobot(3)).resolves.toMatchObject({ status: HttpStatus.OK })
    })
  })

  describe('project deletion', () => {
    it('deletes a project by name with X-Is-Resource-Name', async () => {
      server.use(
        http.delete(`${harborUrl}/api/v2.0/projects/:projectName`, ({ request, params }) => {
          expect(request.headers.get('x-is-resource-name')).toBe('true')
          expect(params.projectName).toBe('myproj')
          return new HttpResponse(null, { status: HttpStatus.OK })
        }),
      )

      await expect(service.deleteProjectByName('myproj')).resolves.toMatchObject({ status: HttpStatus.OK })
    })
  })

  describe('retention error paths', () => {
    it('re-throws when a create races and no retention id materializes', async () => {
      const policy: HarborRetentionPolicy = {
        algorithm: 'or',
        scope: { level: 'project', ref: 123 },
        rules: [],
        trigger: { kind: 'Schedule', settings: { cron: '0 22 2 * * *' }, references: [] },
      }
      let reads = 0
      server.use(
        http.get(`${harborUrl}/api/v2.0/projects/myproj`, () => {
          reads += 1
          return HttpResponse.json({ project_id: 123, metadata: {} })
        }),
        http.post(`${harborUrl}/api/v2.0/retentions`, () =>
          new HttpResponse(null, { status: HttpStatus.BAD_REQUEST })),
      )

      await expect(service.ensureRetention('myproj', policy)).rejects.toThrow('Harbor request failed (400)')
      expect(reads).toBe(2)
    })

    it('re-throws when the retention update fails', async () => {
      const policy: HarborRetentionPolicy = {
        algorithm: 'or',
        scope: { level: 'project', ref: 123 },
        rules: [],
        trigger: { kind: 'Schedule', settings: { cron: '0 22 2 * * *' }, references: [] },
      }
      server.use(
        http.get(`${harborUrl}/api/v2.0/projects/myproj`, () =>
          HttpResponse.json({ project_id: 123, metadata: { retention_id: '325' } })),
        http.put(`${harborUrl}/api/v2.0/retentions/325`, () =>
          new HttpResponse(null, { status: HttpStatus.INTERNAL_SERVER_ERROR })),
      )

      await expect(service.ensureRetention('myproj', policy)).rejects.toThrow('Harbor retention policy failed (500)')
    })

    it('returns null when the project is missing so no retention id exists', async () => {
      server.use(
        http.get(`${harborUrl}/api/v2.0/projects/:projectName`, () =>
          HttpResponse.json({ errors: [{ code: 'NOT_FOUND' }] }, { status: HttpStatus.NOT_FOUND })),
      )

      await expect(service.getRetentionId('missing')).resolves.toBeNull()
    })
  })
})
